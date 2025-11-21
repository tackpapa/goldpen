import jwt from 'jsonwebtoken'

const JWT_SECRET = 'UQdm7s+QfSHtqrqcDj3DfXnFmQ9yA8xpKZLJNhFiGHVMC1UR3bwH4z2eC8v7Gx5A'

const anonToken = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
  },
  JWT_SECRET
)

const serviceToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60)
  },
  JWT_SECRET
)

console.log('ANON KEY:')
console.log(anonToken)
console.log('\nSERVICE ROLE KEY:')
console.log(serviceToken)
