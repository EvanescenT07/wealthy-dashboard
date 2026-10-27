import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEFAULT_WALLETS = [
  { name: "Shopeepay", slug: "shopeepay", color: "#EA580C", icon: "shopping-bag", sortOrder: 1 },
  { name: "Gopay", slug: "gopay", color: "#0284C7", icon: "smartphone", sortOrder: 2 },
  { name: "Jago", slug: "jago", color: "#D97706", icon: "landmark", sortOrder: 3 },
  { name: "Blu", slug: "blu", color: "#0D9488", icon: "credit-card", sortOrder: 4 },
  { name: "Mandiri", slug: "mandiri", color: "#1D4ED8", icon: "building-2", sortOrder: 5 },
  { name: "Ovo", slug: "ovo", color: "#7C3AED", icon: "wallet", sortOrder: 6 },
  { name: "Seabank", slug: "seabank", color: "#E11D48", icon: "waves", sortOrder: 7 },
  { name: "Paypal", slug: "paypal", color: "#2563EB", icon: "globe", sortOrder: 8 },
  { name: "Jenius", slug: "jenius", color: "#059669", icon: "coins", sortOrder: 9 },
];

export async function runSeed() {
  const adminUsername = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword && process.env.NODE_ENV === "production") {
    throw new Error("[SECURITY FATAL] Refusing to seed admin user with default credentials in production.");
  }

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash: hashPassword(adminPassword ?? "admin123"),
      displayName: "Primary Account Owner",
    },
  });

  for (const wallet of DEFAULT_WALLETS) {
    await prisma.wallet.upsert({
      where: { name: wallet.name },
      update: {
        color: wallet.color,
        icon: wallet.icon,
        isDefault: true,
        sortOrder: wallet.sortOrder,
      },
      create: {
        name: wallet.name,
        slug: wallet.slug,
        manualBalance: BigInt(0),
        color: wallet.color,
        icon: wallet.icon,
        isDefault: true,
        isVisible: true,
        sortOrder: wallet.sortOrder,
      },
    });
  }

  await prisma.budgetSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      monthlyLimitIdr: BigInt(5000000),
    },
  });

  console.info(
    `Seeded default user '${adminUsername}', 9 primary wallets, and default monthly budget setting.`
  );
}

if (import.meta.main) {
  runSeed()
    .catch((error: unknown) => {
      console.error("Failed to seed database:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
