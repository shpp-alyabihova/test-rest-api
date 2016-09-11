'use strict';

const User = require('./models.js').UserModel;
const Item = require('./models.js').ItemModel;

const passwordHash = require('password-hash');

module.exports = {

    addUser(userData) {
        let user = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            password: passwordHash.generate(userData.password),
            phone: userData.phone,
            Authorization: userData.authorization
        };
        return new User(user).save()
            .then((user)=> {
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    },

    getUserById: (auth, id)=> {
        return User
            .findOne({id: id})
            .then((user)=> {
                if (auth == user.Authorization) {
                    return Promise.resolve(user);
                }
                else {
                    throw Error('Unauthorized');
                }
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    findUser: (userData)=> {
        let condition = (userData.finder == 'name') ? { name: userData.value } : { email: userData.value };
        return User
            .find(condition)
            .then((user)=> {
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    },

    getUserByEmail: (email)=> {
        return User
            .findOne({email: email})
            .then((user)=> {
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    },

    getUserByAuth: (auth)=> {
        return User
            .findOne({ Authorization: auth})
            .then((user)=> {
                if (!user) {
                        throw Error("Unauthorized");
                }
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    updateUser: (auth, userData)=> {
        if (userData.password) {
            userData.password = passwordHash.generate(userData.password);
        }
        return User
            .findOneAndUpdate({ Authorization: auth }, userData, { new: true })
            .then((user)=> {
                if (!user) {
                    throw Error("Unauthorized");
                }
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    updateUserAuth: (userData)=> {
        return User
            .findOneAndUpdate({ email: userData.email }, userData, { new: true })
            .then((user)=> {
                return Promise.resolve(user);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    },

    checkValidUser: (userData)=> {
        return User
            .findOne({ email: userData.email })
            .then((user)=> {
                if (!user) {
                    throw Error("Wrong email");
                }
                if ( isPasswordValid(userData.password, user.password) ){
                    return Promise.resolve(user);
                } else {
                    throw Error("Wrong password");
                }
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    addItem: (itemData)=> {
        return new Item(itemData).save()
            .then((item)=> {
                return Promise.resolve(item);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    },

    getItemById: (itemData)=> {
        return Item
            .findOne(itemData)
            .then((item)=> {
                if (!item) {
                    throw Error("Not found");
                }
                return Promise.resolve(item);
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    updateItem: (itemData, returnNew)=> {
        return Item
            .findOneAndUpdate({ id: itemData.id, user_id: itemData.user_id }, itemData, { new: returnNew })
            .then((item)=> {
                if (!item) {
                    throw Error("Not found");
                }
                return Promise.resolve(item);
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    deleteItem: (id, user_id)=> {
        return Item
            .findOneAndRemove({ id: id, user_id: user_id })
            .then((item)=> {
                if (!item) {
                    throw Error("Not found");
                }
                return Promise.resolve(item);
            })
            .catch((err)=> {
                return Promise.reject(err.message);
            })
    },

    findItems: (itemData)=> {
        let req = {}, sort_opt = {};
        if (itemData.title) {
            req.title = itemData.title;
        }
        if (itemData.user_id) {
            req.user_id = itemData.user_id;
        }
        sort_opt[itemData.order_by] = itemData.order_type;
        return Item
            .find(req).sort(sort_opt)
            .then((items)=> {
                return Promise.resolve(items);
            })
            .catch((err)=> {
                return Promise.reject(err);
            })
    }
};



function isPasswordValid(password, hashedPassword) {
    return passwordHash.verify(password, hashedPassword);
}

