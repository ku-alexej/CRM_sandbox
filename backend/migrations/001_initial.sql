CREATE TABLE columns (
    id          serial PRIMARY KEY,
    name        text NOT NULL,
    type        text NOT NULL CHECK (type IN ('text', 'number', 'date', 'phone')),
    position    int  NOT NULL
);

CREATE TABLE contacts (
    id          serial PRIMARY KEY,
    data        jsonb NOT NULL DEFAULT '{}'
);
