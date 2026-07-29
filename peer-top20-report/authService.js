import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: '管理员',
  [ROLES.MANAGER]: '经理',
  [ROLES.EMPLOYEE]: '员工',
};

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const next = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(next, 'hex'), Buffer.from(hash, 'hex'));
}

function sanitizeUser(user) {
  const { passwordHash, passwordSalt, ...safe } = user;
  return {
    ...safe,
    roleLabel: ROLE_LABELS[user.role] || user.role,
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readUsersFile() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeUsersFile(users) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf8');
}

async function ensureDefaultAdmin() {
  const users = await readUsersFile();
  if (users.some((user) => user.username === 'admin')) {
    return;
  }
  const { salt, hash } = hashPassword('maoniu@9527');
  users.push({
    id: crypto.randomUUID(),
    username: 'admin',
    displayName: '系统管理员',
    role: ROLES.ADMIN,
    parentId: null,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await writeUsersFile(users);
}

export async function initAuthStore() {
  await ensureDefaultAdmin();
}

export async function login(username, password) {
  const users = await readUsersFile();
  const user = users.find((item) => item.username === String(username || '').trim());
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    throw new Error('用户名或密码错误');
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
}

export function logout(token) {
  if (token) {
    sessions.delete(token);
  }
}

export async function getSessionUser(token) {
  if (!token) {
    return null;
  }
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  const users = await readUsersFile();
  const user = users.find((item) => item.id === session.userId);
  return user ? sanitizeUser(user) : null;
}

export async function listUsers() {
  const users = await readUsersFile();
  return users.map(sanitizeUser);
}

export async function getUserDirectory() {
  const users = await readUsersFile();
  const byUsername = new Map(users.map((user) => [user.username, user]));
  const byId = new Map(users.map((user) => [user.id, user]));
  return { users, byUsername, byId };
}

export function canManageUser(operator, targetUser) {
  if (operator.role === ROLES.ADMIN) {
    return true;
  }
  if (targetUser.id === operator.id) {
    return true;
  }
  return targetUser.parentId === operator.id;
}

export function canViewReportByCreator(operator, createdBy, byUsername) {
  if (operator.role === ROLES.ADMIN) {
    return true;
  }
  if (createdBy === operator.username) {
    return true;
  }
  const creator = byUsername.get(createdBy);
  return Boolean(creator && creator.parentId === operator.id);
}

export async function listUsersForOperator(operator) {
  const users = await readUsersFile();
  const visible = users.filter((user) => canManageUser(operator, user));
  return visible.map(sanitizeUser);
}

export async function listParentCandidatesForOperator(operator, targetUserId) {
  const users = await readUsersFile();
  const target = users.find((user) => user.id === targetUserId);
  if (!target) {
    throw new Error('账号不存在');
  }
  if (!canManageUser(operator, target)) {
    throw new Error('无权修改该账号');
  }

  if (operator.role === ROLES.ADMIN) {
    return users.filter((user) => user.id !== targetUserId).map(sanitizeUser);
  }

  const candidateIds = new Set();
  users.forEach((user) => {
    if (user.id === targetUserId) {
      return;
    }
    if (canManageUser(operator, user)) {
      candidateIds.add(user.id);
    }
  });
  if (target.parentId) {
    candidateIds.add(target.parentId);
  }
  candidateIds.add(operator.id);

  return users.filter((user) => candidateIds.has(user.id)).map(sanitizeUser);
}

export async function createUser(payload, operator) {
  if (operator.role !== ROLES.ADMIN) {
    throw new Error('仅管理员可创建账号');
  }

  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  const role = payload.role || ROLES.EMPLOYEE;
  const parentId = payload.parentId || null;

  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }
  if (!Object.values(ROLES).includes(role)) {
    throw new Error('账号类型无效');
  }

  const users = await readUsersFile();
  if (users.some((item) => item.username === username)) {
    throw new Error('用户名已存在');
  }
  if (parentId && !users.some((item) => item.id === parentId)) {
    throw new Error('上级人员不存在');
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    username,
    displayName: username,
    role,
    parentId,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsersFile(users);
  return sanitizeUser(user);
}

export async function updateUser(id, payload, operator) {
  const users = await readUsersFile();
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('账号不存在');
  }

  const current = users[index];
  if (!canManageUser(operator, current)) {
    throw new Error('无权修改该账号');
  }

  if (operator.role === ROLES.ADMIN) {
    if (payload.username && payload.username !== current.username) {
      if (users.some((item) => item.username === payload.username)) {
        throw new Error('用户名已存在');
      }
      current.username = String(payload.username).trim();
    }
    if (payload.displayName !== undefined || payload.username) {
      current.displayName = current.username;
    }
    if (payload.role !== undefined) {
      if (!Object.values(ROLES).includes(payload.role)) {
        throw new Error('账号类型无效');
      }
      if (current.username === 'admin' && payload.role !== ROLES.ADMIN) {
        throw new Error('不能修改默认管理员的角色');
      }
      current.role = payload.role;
    }
  } else {
    if (payload.username !== undefined && payload.username !== current.username) {
      throw new Error('无权修改用户名');
    }
    if (payload.role !== undefined && payload.role !== current.role) {
      throw new Error('无权修改账号类型');
    }
  }

  if (payload.parentId !== undefined) {
    if (payload.parentId && !users.some((item) => item.id === payload.parentId)) {
      throw new Error('上级人员不存在');
    }
    if (payload.parentId === current.id) {
      throw new Error('上级人员不能是自己');
    }
    current.parentId = payload.parentId || null;
  }
  if (payload.password) {
    const { salt, hash } = hashPassword(payload.password);
    current.passwordSalt = salt;
    current.passwordHash = hash;
  }

  current.updatedAt = new Date().toISOString();
  users[index] = current;
  await writeUsersFile(users);
  return sanitizeUser(current);
}

export async function deleteUser(id, operator) {
  if (operator.role !== ROLES.ADMIN) {
    throw new Error('仅管理员可删除账号');
  }

  const users = await readUsersFile();
  const user = users.find((item) => item.id === id);
  if (!user) {
    throw new Error('账号不存在');
  }
  if (user.username === 'admin') {
    throw new Error('不能删除默认管理员账号');
  }
  if (users.some((item) => item.parentId === id)) {
    throw new Error('该账号仍有下级人员，请先调整下级上级');
  }

  const next = users.filter((item) => item.id !== id);
  await writeUsersFile(next);
  return { success: true };
}
