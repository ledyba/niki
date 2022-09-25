########################################################################################################################
## build
########################################################################################################################

.PHONY: dev
dev:
	bash _helpers/dev.sh

########################################################################################################################
## build
########################################################################################################################

.PHONY: FORCE
FORCE: ;

.PHONY: build
build: FORCE
	UID=$(shell id -u) GID=$(shell id -g) \
		docker-compose build

.PHONY: upgrade
upgrade: FORCE
	cd protocol && npm run up
	cd server && npm run up
	cd client && npm run up

########################################################################################################################
## DB
########################################################################################################################

.PHONY: up
up: var/psql
	UID=$(shell id -u) GID=$(shell id -g) docker-compose up -d
	$(MAKE) wait

.PHONY: wait
wait:
	@UID=$(shell id -u) GID=$(shell id -g) docker-compose run \
		--rm \
		--use-aliases \
		db \
		bash /helpers/wait-boot.sh

.PHONY: migrate
migrate:
	bash db/flyway migrate

.PHONY: down
down:
	UID=$(shell id -u) GID=$(shell id -g) docker-compose down

.PHONY: backup
backup:
	sudo bash _scripts/backup.sh $(shell id -g) $(shell id -u) var

.PHONY: log
log:
	docker-compose logs -f --tail 0

.PNONY: reload
reload:
	$(MAKE) down
	$(MAKE) up

.PHONY: db-cli
db-cli:
	bash ./db/cli

var/psql:
	mkdir -p "$@"

