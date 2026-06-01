# Tymbr – Firemní správa úkolů

Moderní task management aplikace pro týmy. Sdílená kanban nástěnka, správa úkolů, kategorie, komentáře.

## Rychlé nasazení na Vercel (veřejná URL)

Klikněte na tlačítko níže – Vercel propojí GitHub repo a vygeneruje veřejnou URL:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmndesigncz%2FTymbr-APP&env=NEXTAUTH_SECRET,DATABASE_URL,DATABASE_AUTH_TOKEN&envDescription=Viz%20README%20pro%20popis%20prom%C4%9Bnn%C3%BDch&project-name=tymbr-app)

### Potřebné proměnné prostředí

| Proměnná | Popis | Kde získat |
|---|---|---|
| `NEXTAUTH_SECRET` | Libovolný náhodný řetězec (32+ znaků) | `openssl rand -hex 32` |
| `DATABASE_URL` | URL Turso databáze | Viz níže |
| `DATABASE_AUTH_TOKEN` | Auth token Turso | Viz níže |

### Nastavení databáze (Turso – zdarma)

1. Zaregistrujte se na [turso.tech](https://turso.tech) (GitHub přihlášení)
2. Vytvořte novou databázi: **Dashboard → Create database**
3. Zkopírujte `libsql://...` URL a vygenerujte auth token
4. Po nasazení spusťte seed přes Vercel CLI nebo lokálně:
   ```bash
   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run seed
   ```

---

## Lokální vývoj

```bash
npm install
npm run seed        # vytvoří demo data (SQLite)
npm run dev         # http://localhost:3000
```

**Testovací přihlášení:**
- Email: `admin@tymbr.cz`
- Heslo: `demo1234`

## Funkce

- Přihlášení / registrace
- Sdílená kanban nástěnka (drag & drop)
- Úkoly: název, popis, status, priorita, termín, kategorie, přiřazení
- Komentáře k úkolům
- Správa kategorií s výběrem barvy
- Dashboard se statistikami a přehledem
- Filtry podle statusu, priority, kategorie
- Responsivní design (desktop + mobil)

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Prisma 7 · SQLite/Turso · NextAuth 4
