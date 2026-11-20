const bcrypt = require('bcryptjs');
const { validate, signToken, conflict, unauthorized, notFound, Topics } = require('@nestar/common');
const { registerSchema, loginSchema, updateMeSchema } = require('./schemas');

const publicUser = ({ passwordHash, ...user }) => user;

function createAuthService({ users, bus, jwtSecret, jwtExpiresIn = '7d', bcryptRounds = 10 }) {
  const issue = (user) => ({ user: publicUser(user), token: signToken(user, jwtSecret, jwtExpiresIn) });

  return {
    async register(input) {
      const data = validate(registerSchema, input);
      if (await users.findOne({ email: data.email })) throw conflict('An account with this email already exists');

      const { password, ...rest } = data;
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      const user = await users.create({ ...rest, passwordHash });

      await bus.publish(Topics.USER_REGISTERED, { userId: user.id, name: user.name, role: user.role });
      return issue(user);
    },

    async login(input) {
      const { email, password } = validate(loginSchema, input);
      const user = await users.findOne({ email });
      // Same message for "no such email" and "wrong password" so attackers can't probe accounts.
      const ok = user && (await bcrypt.compare(password, user.passwordHash));
      if (!ok) throw unauthorized('Email or password is incorrect');
      return issue(user);
    },

    async me(userId) {
      const user = await users.findById(userId);
      if (!user) throw notFound('User not found');
      return publicUser(user);
    },

    async updateMe(userId, input) {
      const patch = validate(updateMeSchema, input, { partial: true });
      const user = await users.updateById(userId, patch);
      if (!user) throw notFound('User not found');
      // Role may have changed → hand back a fresh token so the new role is effective immediately.
      return issue(user);
    },

    /** Used by other services to show "Listed by Ann" without exposing emails. */
    async publicProfile(userId) {
      const user = await users.findById(userId);
      if (!user) throw notFound('User not found');
      return { id: user.id, name: user.name, role: user.role, createdAt: user.createdAt };
    },
  };
}

module.exports = { createAuthService, publicUser };
