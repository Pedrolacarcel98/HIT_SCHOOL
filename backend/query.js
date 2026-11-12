const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(u => {
    console.log('Users in DB:', u.length);
    if(u.length > 0) {
        console.log(u.map(user => user.email));
    }
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
