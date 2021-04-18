########################################################################################################################
## build
########################################################################################################################

.PHONY: run
run:
	bash helpers/start-dev.sh

########################################################################################################################
## build
########################################################################################################################

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
	UID=$(shell id -u) GID=$(shell id -g) docker-compose up -d db
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

var/psql:
	mkdir -p "$@"
