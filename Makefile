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
build:
	$(MAKE) build-bridge
	$(MAKE) -j2 build-client build-server

.PHONY: build-bridge
build-bridge: FORCE
	cd bridge && npm run build

.PHONY: build-client
build-client: FORCE
	cd client && npm run build

.PHONY: build-server
build-server: FORCE
	cd server && npm run build

.PHONY: upgrade
upgrade: FORCE
	cd bridge && npm run up
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
	$(MAKE) down
	sudo bash _helpers/backup.sh $(shell id -g) $(shell id -u) var
	$(MAKE) up

.PHONY: log
log:
	docker-compose logs -f --tail 0

.PNONY: reload
reload:
	$(MAKE) down
	$(MAKE) up

.PHONY: cli
cli:
	bash ./db/cli

var/psql:
	mkdir -p "$@"
