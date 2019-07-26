import RedisPool from "./RedisPool";
import { RedisPoolMember } from "./RedisPoolMember";

async function recur(member: RedisPoolMember, key: string) {
    let start = Date.now();
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => {
            setTimeout(resolve, Math.floor(Math.random() * 5));
        });
        console.log(RedisPool.getSetSizes());
        await member.watch(key);
        let multi = member.getMulti();
        multi.incr(key);
        await member.exec(multi);
    }

    member.releaseConnection();
    console.log(RedisPool.getSetSizes());
}

async function task(num) {
    try {
        await RedisPool.init();
    } catch (err) {
        console.log("init error", err);
        return;
    }

    for (let i = 0; i < num; i++) {
        try {
            let member = await RedisPool.getClient();
            recur(member, String(i));
            // await new Promise(resolve => {
            //   setTimeout(resolve, 50);
            // });
        } catch (e) {
            console.log("error in for loop", e);
        }
    }
}

task(10000);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 10000);
// setTimeout(() => {
//   r();
//   console.log("-------------------------------------------------------------");
// }, 20000);
