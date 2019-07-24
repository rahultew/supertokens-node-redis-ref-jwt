# Contributing to SuperTokens

Contributions are always welcome. Before contributing please read the [code of conduct](https://github.com/supertokens/supertokens-node-redis-ref-jwt/blob/master/CODE_OF_CONDUCT.md) & search [the issue tracker](https://github.com/supertokens/supertokens-node-redis-ref-jwt/issues); your issue may have already been discussed or fixed in master. To contribute, fork SuperTokens, commit your changes, & send a pull request.

# Questions
We are most accessible via team@supertokens.io, via the GitHub issues feature and our [Discord server](https://supertokens.io/discord). 

## Pull Requests
Before issuing a pull request, please make sure:
- There are no Typescript compilation issues - we have a pre-commit hook to enforce this
- Code is formatted properly - we have a pre-commit hook to enforce this
- All tests are passing. We will also be running tests when you issue a pull request.

Please only issue pull requests to the dev branch.


## Prerequisites

1) You will need NodeJS and Redis on your local system to run and test the repo.

2) Install node dependencies
    ```bash
    npm install -d
    ```

3) Set-up hooks
    ```bash
    npm run set-up-hooks
    ```

## Coding standards
In addition to the following guidelines, please follow the conventions already established in the code.

- **Naming**
    - Use camel case for all variable names: ```aNewVariable```
    - TODO: redis database name?
    - Use camel case name for new files: ```helloWorld.ts```
    - For classes, use camel case, starting with a capital letter: ```MyClass```
    - For constants, use all caps with underscores: ```A_CONSTANT```

- **Comments**
    - Please refrain from commenting very obvious code. But for anything else, please do add comments.
    - For every function, please write what it returns, if it throws an error (and what type), as well as what the params mean (if they are not obvious).

- **Error handling**
    - Please only stick to throwing AuthErrors to the client of this repo.

All other issues like quote styles, spacing etc.. will be taken care of by the formatter.


## Pre committing checks

1) Run the build pretty script
    ```bash
    npm run build-pretty
    ```

2) If you have edited ```/index.ts``` or ```/express.ts```, please make the corresponding changes to ```/index.js``` or ```express.js```. In the ```.js``` files, be sure to change any ```import/export``` statements to use ```/lib/build/``` and not ```/lib/ts``` 


## Pre push

Run unit tests and make sure all tests are passing.
```bash
npm test
```
You can change the following Redis params while testing:
```bash
TODO

# For example

```
**Please make sure that before running the tests, the db is created and that the given user has read and write permissions in it**

If you have docker, we have a container that has node, Redis and git installed in it
````bash
docker pull rishabhpoddar/node-redis-git

# open a shell in the container, checkout your repo and run:
TODO: add commands to start redis
(cd / && ./createUser.sh)
npm install -d
npm test
````

