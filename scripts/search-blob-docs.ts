import { list } from "@vercel/blob";

const needles = [
  "1780271755503-e053dcb0__NIN.png",
  "1780272703004-4a7213db__Ekene Akubue CV.pdf",
  "NIN.png",
];

async function main() {
  let cursor: string | undefined;
  const matches: string[] = [];
  let total = 0;

  do {
    const page = await list({ prefix: "applications/", cursor, limit: 1000 });
    for (const blob of page.blobs) {
      total++;
      const name = blob.pathname.split("/").pop() ?? "";
      if (
        needles.some(
          (needle) =>
            name === needle ||
            name.includes(needle) ||
            blob.pathname.includes(needle)
        )
      ) {
        matches.push(blob.pathname);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
    process.stdout.write(`\rScanned ${total} blobs…`);
  } while (cursor);

  console.log(`\nTotal: ${total}`);
  console.log("Matches:", matches.length ? matches : "(none)");
}

main().catch(console.error);
