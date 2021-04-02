
.PHONY: up
up: var/mysql
	UID=$(shell id -u) GID=$(shell id -g) docker-compose up -d db

.PHONY: down
down:
	docker-compose up down

.PHONY: clean
clean:
	rm -Rfv db/var

var/mysql:
	mkdir -p var/mysql
