CREATE DATABASE db_fs;

USE DATABASE db_fs;

CREATE TABLE path
(
	partition_key CHAR(64) NOT NULL,
	folder_name VARCHAR(255),
	bytes BIGINT,
	PRIMARY KEY(partition_key, folder_name)
);

CREATE TABLE root
(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	data TEXT,
	bytes BIGINT
);

INSERT INTO path VALUES ("root", "root", 0)
