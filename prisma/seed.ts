import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.upsert({
    where: { code: "100M" },
    update: {},
    create: { code: "100M", name: "100 Meters", isTimed: true }
  });

  await prisma.event.upsert({
    where: { code: "200M" },
    update: {},
    create: { code: "200M", name: "200 Meters", isTimed: true }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
