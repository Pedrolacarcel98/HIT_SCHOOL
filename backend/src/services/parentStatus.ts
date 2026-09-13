import { PrismaClient } from '@prisma/client';

export const deactivateParentIfNoActiveChildren = async (prisma: PrismaClient, parentId?: string | null) => {
  if (!parentId) return false;

  const activeChildren = await prisma.user.count({
    where: { parentId, role: 'STUDENT', status: 'ACTIVE' }
  });

  if (activeChildren === 0) {
    await prisma.user.updateMany({
      where: { id: parentId, role: 'PARENT', status: 'ACTIVE' },
      data: { status: 'INACTIVE' }
    });
    return true;
  }

  return false;
};
