# A POINT OF SALE USING POCKETBASE AND NEXT.JS
## Why PocketBase?
- It is small.
- It is lightweight.
- It has it own static server so nextjs static exports shall work fine.
- It will be easy to migrate from if requirements need a more powerful DataBase.
- it is similar to firebase.

## Why nextjs?
- It is fast.
- It is superfast (compared to react).
- It is much easier to maintain than React.
- It is popular.


## Getting Started

1. download pocketbase.
2. run `pocketbase.exe`.
3. goto this address `http://127.0.0.1:8090/_/` in terminal, `Ctrl` + clicking on it should work.
3. create an admin account.
4. import data, that would include all tables too. it is easy.
5. close pocketbase.
6. copy `pb_public` to where the `pocketbase.exe` is located
7. run pocketbase again.
8. go to this address `http://127.0.0.1:8090`.
9. log in with `admin` and `1234567890`.
10. for subsequernt runs just run pocketbase and go to this address `http://127.0.0.1:8090`.

-------------------------------------------------------------------------------
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
