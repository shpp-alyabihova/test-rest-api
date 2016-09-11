"use strict";
const fs = require('fs');
const Promise = require('bluebird');
const writeFile = Promise.promisify(fs.writeFile);

const db = require('../mongo/controllers.js');
const getMessageByHTTPCode = require('../configs/code-messages.js');
const passwordHash = require('password-hash');
const config = require('../config.json');

class Router {
    constructor(log) {
        this.log = log;
        this.log.info("router was initiated");
    }

    registerUser (req, res) {
        let name = req.body.name;
        let email = req.body.email;
        let password = req.body.password;
        let phone = req.body.phone || "";
        let res_data = [];

        if (!name || !email || !password) {
            if (!name)
                addErrorMsgToDataResponse('name', res_data);
            if (!email)
                addErrorMsgToDataResponse('email', res_data);
            if (!password)
                addErrorMsgToDataResponse('password', res_data);
            this.sendErrorResponse(res, 422, res_data);
        } else {
            let id = generateId();
            let auth = hashId(id);
            db.addUser ({
                id: id,
                name: name,
                email: email,
                password: password,
                phone: phone,
                authorization: auth
            })
            .then (()=> {
                this.sendSuccessResponse(res, 200, { token: auth });
            })
            .catch((err)=> {
                let code = 422;
                if (~err.message.indexOf('email')) {
                    let err_data = {};
                    err_data.message = `user with such email is already exist`;
                    err_data.field = `email`;
                    res_data.push(err_data);
                } else {
                    code = 500;
                    res_data = {};
                }
                this.sendErrorResponse(res, code, res_data);
                this.log.error(err);
            })
        }
    }

    loginUser (req, res) {
        let email = req.body.email;
        let password = req.body.password;
        let res_data = [];

        if (!email || !password) {
            if (!email)
                addErrorMsgToDataResponse('email', res_data);
            if (!password)
                addErrorMsgToDataResponse('password', res_data);
            this.sendErrorResponse(res, 422, res_data);
        } else {
            db.checkValidUser({ email: email, password: password })
                .then((user)=> {
                    user.Authorization = hashId();
                    return db.updateUserAuth(user);
                })
                .then((updatedUser)=> {
                    this.sendSuccessResponse(res, 200, { token: updatedUser.Authorization });
                })
                .catch((err)=> {
                    let err_data = {};
                    let field = '';
                    let code = 422;
                    if (err == "Wrong password") {
                        field = 'password';
                    } else if (err == "Wrong email"){
                        field = 'email';
                    }
                    if (field) {
                        err_data.field = (field) ? field : 'error';
                        err_data.message = err;
                        res_data.push(err_data);
                    } else {
                        code = 500;
                        res_data = {};
                    }
                    this.sendErrorResponse(res, code, res_data);
                    this.log.error(err);
                })
        }
    }

    getCurrentUser (req, res) {
        let auth = req.header('Authorization');
        let res_data = [];
        db.getUserByAuth(auth)
            .then((user)=> {
                let res_data = buildSingleUserBodyResponse(user);
                this.sendSuccessResponse(res, 200, res_data);

            })
            .catch((err)=> {
                let code = (err == 'Unauthorized') ? 401 : 500;
                this.sendErrorResponse(res, code, {});
                this.log.error(err);
            })
    }

    updateCurrentUser (req, res) {
        let auth = req.header('Authorization');
        let email = req.body.email;
        let password = req.body.current_password;
        let new_password = req.body.new_password;
        let name = req.body.name;
        let phone = req.body.phone;
        let res_data = [];

        if (password && !new_password) {
            addErrorMsgToDataResponse('new_password', res_data);
            this.sendErrorResponse(res, 422, res_data);
        } else {
            let userData = {};
            if (email)
                userData.email = email;
            if (password)
                userData.password = new_password;
            if (name)
                userData.name = name;
            if (phone)
                userData.phone = phone;
            db.updateUser(auth, userData)
                .then((user)=> {
                    let res_data = buildSingleUserBodyResponse(user);
                    this.sendSuccessResponse(res, 200, res_data);
                })
                .catch((err)=> {
                    let code = 422;
                    if (~err.indexOf('email')) {
                        let err_data = {};
                        err_data.message = `user with such email is already exist`;
                        err_data.field = `email`;
                        res_data.push(err_data);
                    } else {
                        code = (err == "Unauthorized") ? 401 : 500;
                        res_data = {};
                    }
                    this.sendErrorResponse(res, code, res_data);
                    this.log.error(err);
                })
        }
    }

    getUserById (req, res) {
        let auth = req.header('Authorization');
        let id = req.params.id;
        db.getUserById(auth, id)
            .then((user)=> {
                let res_data = buildSingleUserBodyResponse(user);
                this.sendSuccessResponse(res, 200, res_data);
            })
            .catch((err)=> {
                let code = (err == 'Unauthorized') ? 401 : 404;
                this.sendErrorResponse(res, code, {});
                this.log.error(err);
            })
    }

    searchUsers (req, res) {
        let name = req.query.name;
        let email = req.query.email;
        let userData = (email) ? { finder: 'email', value: email } : { finder: 'name', value: name };
        db.findUser(userData)
            .then((users)=> {
                let res_data = buildUsersBodyResponse(users);
                this.sendSuccessResponse(res, 200, res_data);
            })
            .catch((err)=> {
                this.sendErrorResponse(res, 500, {});
                this.log.error(err);
            })
    }

    createItem (req, res) {
        let auth = req.header('Authorization');
        let title = req.body.title;
        let description = req.body.description;
        let image = `${config.serverIp}${config.imageQuotes.imageDirectory}${config.imageQuotes.defaultImage}`;
        let res_data = [];
        if (!title || !description) {
            if (!title)
                addErrorMsgToDataResponse("title", res_data);
            if (!description)
                addErrorMsgToDataResponse("description", res_data);
            this.sendErrorResponse(res, 422, res_data);
        } else {
            db.getUserByAuth(auth)
                .then((user)=> {
                    let itemData = {
                        id: generateId(),
                        image: image,
                        created_at: new Date().getTime(),
                        title: title,
                        description: description,
                        user_id: user.id,
                        user: buildSingleUserBodyResponse(user)
                    };
                    return db.addItem(itemData);
                })
                .then((item)=> {
                        res_data = buildSingleItemBodyResponse(item);
                        this.sendSuccessResponse(res, 200, res_data);
                })
                .catch((err)=> {
                    let code = ("Unauthorized") ? 401 : 500;
                    this.sendErrorResponse(res, code, {});
                    this.log.error(err);
                })
        }
    }

    getItemById (req, res) {
        let id = req.params.id;
        db.getItemById({ id: id })
            .then((item)=> {
                let res_data = buildSingleItemBodyResponse(item);
                this.sendSuccessResponse(res, 200, res_data);
            })
            .catch((err)=> {
                let code = (err == "Not found") ? 404 : 500;
                this.sendErrorResponse(res, code, {});
                this.log.error(err);
            })
    }

    updateItem (req, res) {
        let auth = req.header('Authorization');
        let id = req.params.id;
        let title = req.body.title;
        let description = req.body.description;
        let res_data = [];
        if (!title && !description) {
            addErrorMsgToDataResponse('title or description', res_data);
            this.sendErrorResponse(res, 422, res_data);
        } else {
            db.getUserByAuth(auth)
                .then((user)=> {
                    let itemData = {};
                    itemData.id = id;
                    itemData.user_id = user.id;
                    if (title)
                        itemData.title = title;
                    if (description)
                        itemData.description = description;
                    return db.updateItem(itemData, true);
                })
                .then((item)=> {
                    let res_data = buildSingleItemBodyResponse(item);
                    this.sendSuccessResponse(res, 200, res_data);
                })
                .catch((err)=> {
                    let code = (err == "Unauthorized") ? 401 : (err == "Not found") ? 404 : 500;
                    this.sendErrorResponse(res, code, {});
                    this.log.error(err);
                })

        }
    }

    deleteItem (req, res) {
        let auth = req.header('Authorization');
        let id = req.params.id;
        db.getUserByAuth(auth)
            .then((user)=> {
                return db.deleteItem(id, user.id);
            })
            .then(()=> {
                this.sendSuccessResponse(res, 200, {});
            })
            .catch((err)=> {
                let code = (err == "Unauthorized") ? 401 : 404;
                this.sendErrorResponse(res, code, {});
                this.log.error(err);
            })
    }

    searchItems (req, res) {
        let title = req.query.title;
        let user_id = req.query.user_id;
        let order_by = req.query.order_by || "created_at";
        let order_type = req.query.order_type || "desc";
        let res_data = {};
        let itemData = { title: title, user_id: user_id, order_by: order_by };
        itemData.order_type = (order_type === "asc") ? 1 : -1;
        db.findItems(itemData)
            .then((items)=> {
                res_data = buildItemsBodyResponse(items);
                this.sendSuccessResponse(res, 200, res_data);
            })
            .catch((err)=> {
                this.sendErrorResponse(res, 500, {});
                this.log.error(err);
            });

    }

    uploadItemImage (req, res) {
        let auth = req.header('Authorization');
        let id = req.params.id;
        let file = req.file;
        let err_data = isFileQuotesExceeded(file);
        let userData = {};
        if (err_data) {
            this.sendErrorResponse(res, 422, err_data);
        } else {
            db.getUserByAuth(auth)
                .then((user)=> {
                    userData = user;
                    return db.getItemById({ id: id, user_id: user.id });
                })
                .then((item)=> {
                    return writeFileAsync(file, id);
                })
                .then((image)=> {
                    return db.updateItem({ id: id, user_id: userData.id, image: image }, true);
                })
                .then((item)=> {
                    let res_data = buildSingleItemBodyResponse(item);
                    this.sendSuccessResponse(res, 200, res_data);
                })
                .catch((err)=> {
                    let res_data = (err.code == 422) ? err_data : {};
                    let code = (err.code == 422) ? 422 : (err == "Unauthorized") ? 401 : (err == "Not found") ? 404 : 500;
                    this.sendErrorResponse(res, code, res_data);
                    this.log.error(err);
                });
        }
    }

    removeItemImage (req, res) {
        let auth = req.header('Authorization');
        let id = req.params.id;
        let image = `${config.serverIp}${config.imageQuotes.imageDirectory}${config.imageQuotes.defaultImage}`;

        db.getUserByAuth(auth)
            .then((user)=> {
                return db.updateItem({ id: id, user_id: user.id, image: image }, false);
            })
            .then((item)=> {
                let file = item.image;
                if (file !== image) {
                    return deleteFileAsync(file);
                }
            })
            .then((err)=> {
                if (err) {
                    this.log.error(`On delete file catch Error: ${err.message}`);
                }
                this.sendSuccessResponse(res, 200, {});
            })
            .catch((err)=> {
                let code = (err == "Unauthorized") ? 401 : (err == "Not found") ? 404 : 500;
                this.sendErrorResponse(res, code, {});
                this.log.error(err);
            });

    }


    sendSuccessResponse (res, code, data) {
        this.log.info(`send success response: ${JSON.stringify(data)}`);
        res.statusCode = code;
        res.setHeader('Content-Type', 'application/json');
        res.status(code).json(data);
        res.end();
    }

    sendErrorResponse (res, code, data, message) {
        this.log.info(`send error response: ${JSON.stringify(data)}`);
        message = message || getMessageByHTTPCode(code);
        res.statusCode = code;
        res.statusMessage = message;
        res.setHeader('Content-Type', 'application/json');
        res.status(code).json(data);
        res.end();
    }
}


module.exports = Router;


function isFileQuotesExceeded(file) {
    let res_data = [];
    let err_data = {};
    err_data.field = "image";
    if (!file) {
        err_data.message = "no file to upload";
        res_data.push(err_data);
    } else {
        if (!file.buffer) {
            err_data.message = "can not read file";
            res_data.push(err_data);
        }
        if (file.size > config.imageQuotes.limits.fileSize) {
            err_data.message = `file ${file.originalname} is too big`;
            res_data.push(err_data);
        }
        if (!isFileMimeTypeAccepted(file)) {
            err_data.message = `mimetype of ${file.originalname} does not accepted`;
            res_data.push(err_data);
        }
    }
    if (res_data.length > 0) {
        return res_data;
    }
}

function writeFileAsync(file, id) {
    let path = config.imageQuotes.imagePath;
    let fileType = getTypeOfFile(file.originalname);
    let fileName = `${id}.${fileType}`;
    return writeFile(`${path}/${fileName}`, file.buffer)
        .then(()=> {
            return `${config.serverIp}${config.imageQuotes.imageDirectory}${fileName}`;
        })
        .catch((err)=> {
            return Promise.reject({code: 422, data: [{field: "image", message: `can't upload file ${file.originalname}`}] });
        });
}

function deleteFileAsync(filePath) {
    let fileName = getNameOfFile(filePath);
    let path = `${config.imageQuotes.imagePath}${fileName}`;
    return checkFileExists(path)
        .then(()=> {
            return removeFile(path);
        })
        .catch((err)=> {
            return Promise.resolve(err);
        });
}

function checkFileExists(filePath) {
    return new Promise((resolve, reject)=> {
        fs.stat(filePath, (err, stats)=> {
            if (err || !stats.isFile()) {
                reject(err);
            } else {
                resolve(filePath);
            }
        });
    })
        .catch((err)=> {
            return Promise.reject(err);
        })
}

function removeFile(filePath) {
    return new Promise((resolve, reject)=> {
        fs.unlink(filePath, (err)=> {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    })
        .catch((err)=> {
            return Promise.reject(err);
        })
}

function generateId () {
    return new Date().getTime() + Math.round(Math.random()*100);
}

function hashId (id) {
    id = id || generateId();
    return passwordHash.generate(id.toString());
}

function buildSingleUserBodyResponse(user) {
    return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email
    };
}

function buildUsersBodyResponse(users) {
    return users.map((user)=> {
        return buildSingleUserBodyResponse(user);
    });
}

function buildSingleItemBodyResponse(item) {
    return {
        id: item.id,
        image: item.image,
        created_at: item.created_at,
        title: item.title,
        description: item.description,
        user_id: item.user_id,
        user: item.user
    };
}

function buildItemsBodyResponse(items) {
    return items.map((item)=> {
        return buildSingleItemBodyResponse(item);
    });
}

function addErrorMsgToDataResponse(field, res_data) {
    let err_data = {};
    err_data.field = field;
    err_data.message = `field ${field} is required`;
    res_data.push(err_data);
}

function getTypeOfFile(filename) {
    return getEndString(filename, ".");
}

function getNameOfFile(filePath) {
    return getEndString(filePath, "/");
}

function getEndString(str, point) {
    return str.substring(str.lastIndexOf(point) + 1);
}

function isFileMimeTypeAccepted(file) {
    return config.imageQuotes.acceptedMimeTypes.some((mimeType)=> {
        return file.mimetype === mimeType;
    })
}