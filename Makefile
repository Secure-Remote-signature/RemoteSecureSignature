image = remotesecuresignature-app
container = RemoteSec

build:
	docker-compose up -d --build
exec:
	docker-compose exec -it app bash
front:
	docker-compose exec -w /app/frontend app bash
back:
	docker-compose exec -w /app/backend app bash
run:
	docker-compose up -d
stop:
	docker-compose down
restart:
	docker-compose down
	docker-compose up -d