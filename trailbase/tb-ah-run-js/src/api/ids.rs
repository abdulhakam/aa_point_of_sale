//! The id codec: hex <-> the URL-safe base64 the app shows for BLOB ids.
//!
//! The app displays base64 everywhere (invoice ids, party ids, payment ids) and SQLite stores BLOB
//! ids, which are matched with `unhex(?)` rather than against a base64 text parameter. Both
//! directions therefore run constantly — 28 call sites before this was extracted.
//!
//! WHY THIS IS RUST AND NOT JS. A base64 decoder has no loud failure mode. The original
//! implementation was found with a 62-character alphabet instead of 64, and every sextet >= 48
//! decoded to the wrong byte while sextet 63 read `undefined` — producing 22-character ids that
//! matched no row and rendered an empty screen rather than raising. An earlier padding bug in the
//! same code did the same thing. That is the whole argument for writing it once, in a language where
//! an out-of-range index is impossible.
//!
//! `tools/id-codec-check.mjs` asserts the alphabet byte-for-byte before it asserts any encoding, and
//! pins the recorded vector 01A0EBFD3E2176D294C5C5797E90A6E5 -> AaDr_T4hdtKUxcV5fpCm5Q.

use rquickjs::{Ctx, Function, Object, Result};

/// Expose the codec to the guest as `ids.b64ToHex(value)` / `ids.hexToB64(value)`.
///
/// Registered as a plain sync closure, not `Async(..)`: the functions do no I/O, and every existing
/// pure bridge in this component (`render.html`, `render.string`) is registered the same way. An
/// async wrapper would only add a promise tick per call on a path that runs 28 times per request.
pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let ids = Object::new(ctx.clone())?;

    ids.set(
        "b64ToHex",
        Function::new(ctx.clone(), |value: String| -> String { b64_to_hex(&value) }),
    )?;
    ids.set(
        "hexToB64",
        Function::new(ctx.clone(), |value: String| -> String { hex_to_b64(&value) }),
    )?;

    ctx.globals().set("ids", ids)?;
    Ok(())
}

/// The exact 64-character URL-safe base64 alphabet: A-Z a-z 0-9, then `-` (62) and `_` (63).
///
/// Declared as `[u8; 64]` so a short or over-long literal is a compile error rather than a silent
/// mis-decode — the failure this whole module exists to prevent.
const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/// Standard-alphabet characters accepted as well, mapped to their sextet value. A base64 id copied
/// out of a standard encoder (`+`, `/`) must decode the same as the URL-safe form.
#[inline]
fn sextet(byte: u8) -> Option<u8> {
    match byte {
        b'A'..=b'Z' => Some(byte - b'A'),
        b'a'..=b'z' => Some(byte - b'a' + 26),
        b'0'..=b'9' => Some(byte - b'0' + 52),
        b'-' => Some(62),
        b'_' => Some(63),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

/// The URL-safe base64 the app shows -> uppercase hex, for `unhex(?)`.
///
/// Tolerant by design, matching the algorithm the app always used: any character outside both
/// alphabets is skipped rather than throwing, `=` terminates, and `+/` is accepted alongside `-_`.
/// A decoder that differs by one skipped character returns an id that still *looks* right and
/// matches nothing.
pub fn b64_to_hex(value: &str) -> String {
    let mut bits: u32 = 0;
    let mut acc: u32 = 0;
    let mut out = String::with_capacity(value.len() * 3 / 4 + 2);

    for ch in value.bytes() {
        if ch == b'=' {
            break;
        }
        let Some(ix) = sextet(ch) else { continue };
        acc = (acc << 6) | u32::from(ix);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push_str(&format!("{:02X}", (acc >> bits) & 0xff));
        }
    }
    out
}

/// hex -> the URL-safe base64 the app shows. The inverse of [`b64_to_hex`].
///
/// 3 bytes -> 4 sextets, and the final partial group is *padded* rather than filled: a 16-byte id is
/// 22 characters plus `==`. Filling the tail with data instead produced a 24-character id that
/// matched nothing, which is how a materialised invoice document rendered with empty item names.
pub fn hex_to_b64(hex: &str) -> String {
    // Non-hex characters are dropped, so a stray separator cannot shift the sextets.
    let clean: Vec<u8> = hex.bytes().filter(|b| b.is_ascii_hexdigit()).collect();
    let mut out = String::with_capacity(clean.len().div_ceil(2) * 4 / 3 + 4);

    let mut i = 0;
    while i < clean.len() {
        let group = &clean[i..(i + 6).min(clean.len())];
        let n = group.len() / 2;
        let byte = |k: usize| -> u8 {
            if k < n {
                u8::from_str_radix(std::str::from_utf8(&group[k * 2..k * 2 + 2]).unwrap_or("00"), 16)
                    .unwrap_or(0)
            } else {
                0
            }
        };
        let (b0, b1, b2) = (byte(0), byte(1), byte(2));

        out.push(B64[(b0 >> 2) as usize] as char);
        out.push(B64[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        if n > 1 {
            out.push(B64[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if n > 2 {
            out.push(B64[(b2 & 63) as usize] as char);
        } else {
            out.push('=');
        }
        i += 6;
    }

    // The app shows unpadded base64, so the `=`s above are presentation only.
    out.trim_end_matches('=').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The vector recorded when the padding bug was found. If this fails, an id decoded to something
    /// that matched no row.
    const KNOWN_HEX: &str = "01A0EBFD3E2176D294C5C5797E90A6E5";
    const KNOWN_B64: &str = "AaDr_T4hdtKUxcV5fpCm5Q";

    #[test]
    fn alphabet_is_the_canonical_64() {
        assert_eq!(B64.len(), 64);
        assert_eq!(B64[62], b'-');
        assert_eq!(B64[63], b'_');
    }

    #[test]
    fn known_vector_both_directions() {
        assert_eq!(hex_to_b64(KNOWN_HEX), KNOWN_B64);
        assert_eq!(b64_to_hex(KNOWN_B64), KNOWN_HEX);
    }

    #[test]
    fn round_trips() {
        for hex in [
            KNOWN_HEX,
            "000102030405060708090A0B0C0D0E0F",
            "FF",
            "DEADBEEF",
            "00",
            "0000",
            "",
        ] {
            assert_eq!(b64_to_hex(&hex_to_b64(hex)), hex.to_uppercase(), "hex={hex}");
        }
    }

    #[test]
    fn tolerant_of_junk_and_padding() {
        assert_eq!(b64_to_hex("AaDr_T4hdtKUxcV5fpCm5Q!!"), KNOWN_HEX);
        assert_eq!(b64_to_hex("AaDr_T4hdtKUxcV5fpCm5Q=="), KNOWN_HEX);
        assert_eq!(b64_to_hex("+/8="), "FBFF");
        assert_eq!(hex_to_b64(&format!("zz{KNOWN_HEX}")), KNOWN_B64);
    }
}