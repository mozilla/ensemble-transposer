.PHONY: build start lint test compare shell

help:
	@echo "Makefile commands for local development:"
	@echo
	@echo "  build         Build the Docker image"
	@echo "  start         Run ensemble-transposer"
	@echo "  lint          Lint source code"
	@echo "  test          Run tests"
	@echo "  compare       Compare development output to production output"
	@echo "  shell         Start a Bash shell"

build:
	docker image build --tag ensemble-transposer .

start: build
	docker container run --rm --tty --env-file=.env ensemble-transposer npm start

lint: build
	docker container run --rm --tty ensemble-transposer npm run lint

test: build
	docker container run --rm --tty --env-file=.env ensemble-transposer npm test

compare: build
	docker container run --rm --tty --env-file=.env \
	ensemble-transposer npm run compare

shell:
	docker container run --rm --tty --interactive --env-file=.env \
	ensemble-transposer /bin/bash
