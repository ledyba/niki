
.PHONY: up
up: var/mysql
	UID=$(shell id -u) GID=$(shell id -g) docker-compose up -d db
	$(MAKE) wait

.PHONY: wait
wait:
	docker-compose run \
		--rm \
		"--user=$(shell id -u $USER):$(shell id -g $USER)" \
		db \
		bash /helpers/wait-boot.sh

.PHONY: migrate
migrate:
	bash db/flyway migrate

.PHONY: down
down:
	docker-compose down

.PHONY: clean
clean:
	rm -Rfv db/var

.PNONY: recreate
recreate:
	$(MAKE) down
	$(MAKE) clean
	$(MAKE) up
	$(MAKE) wait
	$(MAKE) migrate

var/mysql:
	mkdir -p var/mysql
