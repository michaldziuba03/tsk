## README

#### odpalenie aplikacji

```sh
pnpm install
docker compose up

pnpm db:init
pnpm start:dev
```

#### resetowanie wszystkich danych w bazie danych:

```sh
pnpm db:drop
pnpm db:init
```

#### build

```sh
pnpm build
```

> Pracowałem na Node.js v18.18.0

### wymagane zmienne środowiskowe:

```sh
API_KEY=''
BASIC_USERNAME=''
BASIC_PASSWORD=''
DATABASE_URL='postgresql://postgres@localhost:5432/tsk'
```
