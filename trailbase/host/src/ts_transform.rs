use swc_core::common::sync::Lrc;
use swc_core::common::{FileName, SourceMap, Mark, Globals, GLOBALS};
use swc_core::ecma::codegen::{text_writer::JsWriter, Emitter, Config};
use swc_core::ecma::parser::{Parser, StringInput, Syntax};
use swc_core::ecma::transforms::typescript::strip;
use swc_core::ecma::ast::Pass;

pub fn compile_ts(code: &str) -> anyhow::Result<String> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(FileName::Anon.into(), code.to_string());

    let mut parser = Parser::new(
        Syntax::Typescript(Default::default()),
        StringInput::from(&*fm),
        None,
    );

    let mut program = parser
        .parse_program()
        .map_err(|e| anyhow::anyhow!("Failed to parse TS: {:?}", e))?;

    // SWC requires GLOBALS to be set for some transforms
    let globals = Globals::new();
    let code = GLOBALS.set(&globals, || {
        let top_level_mark = Mark::new();
        let unresolved_mark = Mark::new();
        strip(unresolved_mark, top_level_mark).process(&mut program);

        let mut buf = vec![];
        {
            let mut emitter = Emitter {
                cfg: Config::default(),
                cm: cm.clone(),
                comments: None, 
                wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
            };

            if let Err(e) = emitter.emit_program(&program) {
                return Err(anyhow::anyhow!("Failed to emit JS: {:?}", e));
            }
        }
        
        Ok(String::from_utf8(buf)?)
    })?;

    Ok(code)
}
