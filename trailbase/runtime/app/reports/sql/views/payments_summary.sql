SELECT
  cast(id as text) AS id,
  day,
  party,
  area,
  section,
  booker,
  party_type,
  type,
  paid,
  entries,
  sent,
  sending,
  recieved,
  recieving,
  recieving_returns,
  sending_returns,
  invoice_total,
  total_paid
FROM (
  SELECT
    (ROW_NUMBER() OVER()) AS id,
    substr(created, 1, 10) AS day,
    party,
    area,
    section,
    booker,
    party_type,
    type,
    paid,
    COUNT(*) AS entries,
    COALESCE(SUM(CASE WHEN type = 0 AND paid = TRUE THEN amount ELSE 0 END), 0) AS sent,
    COALESCE(SUM(CASE WHEN type = 0 AND paid = FALSE THEN amount ELSE 0 END), 0) AS sending,
    COALESCE(SUM(CASE WHEN type = 1 AND paid = TRUE THEN amount ELSE 0 END), 0) AS recieved,
    COALESCE(SUM(CASE WHEN type = 1 AND paid = FALSE THEN amount ELSE 0 END), 0) AS recieving,
    COALESCE(SUM(CASE WHEN type = 2 AND party_type = 0 THEN amount ELSE 0 END), 0) AS recieving_returns,
    COALESCE(SUM(CASE WHEN type = 2 AND (party_type IS NULL OR party_type <> 0) THEN amount ELSE 0 END), 0) AS sending_returns,
    COALESCE(SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END), 0) AS invoice_total,
    COALESCE(SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END), 0) AS total_paid
  FROM payments_view
  GROUP BY day, party, area, section, booker, party_type, type, paid
)
