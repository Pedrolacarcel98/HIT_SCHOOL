import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@prisma/client';
import { createChatRouter } from './src/routes/chat';

const users: Record<string, any> = Object.fromEntries([
  ['teacher', 'TEACHER'], ['admin', 'ADMIN'], ['child1', 'STUDENT'], ['child2', 'STUDENT'], ['parent', 'PARENT']
].map(([id, role]) => [id, {
  id, role, status: 'ACTIVE', email: `${id}@example.invalid`,
  parentId: role === 'STUDENT' ? 'parent' : null,
  profile: { firstName: id, lastName: 'Test' }
}]));
users.child1.parent = users.parent;
users.child2.parent = users.parent;

function matches(record: any, where: any): boolean {
  return Object.entries(where || {}).every(([key, value]: [string, any]) => {
    if (key === 'OR') return value.some((condition: any) => matches(record, condition));
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(record[key]);
    return record[key] === value;
  });
}

async function main() {
  const messages: any[] = [];
  const database = {
    user: {
      findUnique: async ({ where }: any) => users[where.id] || null,
      findFirst: async ({ where }: any) => Object.values(users).find(user => matches(user, where)) || null,
      findMany: async ({ where }: any) => Object.values(users).filter(user => matches(user, where))
    },
    chatMessage: {
      create: async ({ data }: any) => {
        const message = { id: String(messages.length + 1), ...data, readAt: null, createdAt: new Date(), updatedAt: new Date(), sender: users[data.senderId], recipient: users[data.recipientId] };
        messages.push(message);
        return message;
      },
      findMany: async ({ where }: any) => messages.filter(message => matches(message, where)),
      count: async ({ where }: any) => messages.filter(message => matches(message, where)).length,
      updateMany: async ({ where, data }: any) => {
        const found = messages.filter(message => matches(message, where));
        found.forEach(message => Object.assign(message, data));
        return { count: found.length };
      }
    }
  };
  const app = express();
  app.use(express.json());
  app.use('/chat', createChatRouter(database as unknown as PrismaClient));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/chat`;
  const request = async (id: string, path: string, body?: any) => {
    const token = jwt.sign({ id, role: users[id].role }, process.env.JWT_SECRET || 'secret');
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, data: await response.json() };
  };
  const send = async (sender: string, recipientId: string, studentId = 'child1') => {
    const response = await request(sender, '', { recipientId, studentId, content: 'Test message' });
    assert.equal(response.status, 201);
    assert.equal(response.data.studentId, studentId);
    return response.data;
  };
  try {
    for (const staff of ['teacher', 'admin']) {
      for (const sender of ['child1', 'parent']) {
        messages.length = 0;
        const first = await send(sender, staff);
        await send(staff, sender);
        const loaded = await request(staff, `?partnerId=${sender}&studentId=child1`);
        assert.equal(loaded.status, 200);
        assert.equal(loaded.data.length, 2);
        assert.equal(messages[0].readAt, null, 'GET must not mark read');
        const later = await send(sender, staff);
        const otherChild = sender === 'parent' ? await send(sender, staff, 'child2') : null;
        const read = await request(staff, '/read', { partnerId: sender, studentId: 'child1', messageIds: loaded.data.map((message: any) => message.id) });
        assert.equal(read.status, 200);
        assert.equal(read.data.unreadCount, 1, 'arrival after GET remains unread');
        assert.ok(messages.find(message => message.id === first.id).readAt);
        assert.equal(messages.find(message => message.id === later.id).readAt, null);
        if (otherChild) assert.equal(messages.find(message => message.id === otherChild.id).readAt, null, 'other child remains unread');
        const contacts = await request(staff, '/contacts');
        const contact = contacts.data.find((item: any) => item.id === sender && (sender !== 'parent' || item.studentId === 'child1'));
        assert.equal(contact.unreadCount, 1);
        const reverse = await request(sender, '/read', { partnerId: staff, studentId: 'child1', messageIds: loaded.data.map((message: any) => message.id) });
        assert.equal(reverse.status, 200);
        assert.equal(reverse.data.unreadCount, 0);
        const missingIds = await request(staff, '/read', { partnerId: sender, studentId: 'child1' });
        assert.equal(missingIds.status, 400);
        const senderContacts = await request(sender, '/contacts?studentId=child1');
        assert.equal(senderContacts.data.find((item: any) => item.id === staff).unreadCount, 0);
        console.log(`PASS ${sender}<->${staff}: context, contacts, read IDs, concurrent arrival and role symmetry`);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });