CREATE FUNCTION update_timestamp() RETURNS TRIGGER
  LANGUAGE plpgsql
AS
$$
BEGIN
  NEW.updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE diaries (
  date date NOT NULL PRIMARY KEY,
  text text NOT NULL,
  created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER text_modify_updated
  BEFORE UPDATE
  ON diaries
  FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();
