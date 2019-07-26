"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const RedisPool_1 = require("./RedisPool");
function recur(member, key) {
    return __awaiter(this, void 0, void 0, function*() {
        let start = Date.now();
        for (let i = 0; i < 10; i++) {
            yield new Promise(resolve => {
                setTimeout(resolve, Math.floor(Math.random() * 5));
            });
            console.log(RedisPool_1.default.getSetSizes());
            yield member.watch(key);
            let multi = member.getMulti();
            multi.incr(key);
            yield member.exec(multi);
        }
        member.releaseConnection();
        console.log(RedisPool_1.default.getSetSizes());
    });
}
function task(num) {
    return __awaiter(this, void 0, void 0, function*() {
        try {
            yield RedisPool_1.default.init();
        } catch (err) {
            console.log("init error", err);
            return;
        }
        for (let i = 0; i < num; i++) {
            try {
                let member = yield RedisPool_1.default.getClient();
                recur(member, String(i));
                // await new Promise(resolve => {
                //   setTimeout(resolve, 50);
                // });
            } catch (e) {
                console.log("error in for loop", e);
            }
        }
    });
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
//# sourceMappingURL=watchTestPool.js.map
