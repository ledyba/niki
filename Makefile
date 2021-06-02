########################################################################################################################
## build
########################################################################################################################

.PHONY: dev
dev:
	bash _helpers/dev.sh

########################################################################################################################
## build
########################################################################################################################

.PHONY: build
build: bridge client ;

.PHONY: bridge
bridge:
	cd bridge && npm run build

.PHONY: client
client:
	cd client && npm run build

########################################################################################################################
## DB
########################################################################################################################

.PHONY: up
up: var/psql
	UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose-dev.yml up -d db
	$(MAKE) wait

.PHONY: wait
wait:
	@UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose-dev.yml run \
		--rm \
		--use-aliases \
		db \
		bash /helpers/wait-boot.sh

.PHONY: migrate
migrate:
	bash db/flyway-dev migrate

.PHONY: down
down:
	UID=$(shell id -u) GID=$(shell id -g) docker-compose -f docker-compose-dev.yml down

.PHONY: clean
clean:
	rm -Rfv var

.PNONY: recreate
recreate:
	$(MAKE) down
	$(MAKE) clean
	$(MAKE) up
	$(MAKE) wait
	$(MAKE) migrate

.PHONY: cli
cli:
	bash ./db/cli-dev

var/psql:
	mkdir -p "$@"
