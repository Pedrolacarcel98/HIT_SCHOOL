import { Prisma, PrismaClient, Role } from '@prisma/client';

type UserEmailUpsertArgs = {
  where: { email: string };
  update: Prisma.UserUncheckedUpdateInput;
  create: Prisma.UserUncheckedCreateInput;
  include?: Prisma.UserInclude;
};

export const upsertUserByEmailAndRole = async (
  prisma: PrismaClient,
  args: UserEmailUpsertArgs
) => {
  const role = args.create.role ?? Role.STUDENT;
  const existing = await prisma.user.findFirst({
    where: { email: args.where.email, role },
    select: { id: true }
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: args.update,
      include: { profile: true }
    });
  }

  return prisma.user.create({
    data: args.create,
    include: { profile: true }
  });
};