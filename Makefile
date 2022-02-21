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
	UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose.yml up -d
	$(MAKE) wait

.PHONY: wait
wait:
	@UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose.yml run \
		--rm \
		--use-aliases \
		db \
		bash /helpers/wait-boot.sh

.PHONY: migrate
migrate:
	bash db/flyway-dev migrate

.PHONY: down
down:
	UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose.yml down

.PHONY: clean
clean:
	rm -Rfv var

.PHONY: log
log:
	docker-compose logs -f --tail 0

.PNONY: reload
reload:
	$(MAKE) down
	$(MAKE) up

.PNONY: recreate
recreate:
	$(MAKE) down
	$(MAKE) clean
	$(MAKE) up
	$(MAKE) migrate

.PHONY: cli
cli:
	bash ./db/cli

var/psql:
	mkdir -p "$@"
