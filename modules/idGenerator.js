'use strict';

const password_hash = require('password-hash');


class idGenerator {

    constructor () {
        this.saltMin = config.ranges.saltMin;
        this.saltMax = config.ranges.saltMax;
    }

    shuffle () {
        let a = this.split(""),
            n = a.length;

        for(let i = n - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a.join("");
    }

    generateIDs () {
        return this.generateName() + '_' + this.generateSalt();
    }

    generateSalt () {
        return '' + Math.round(Math.random() * (this.saltMax - this.saltMin) + this.saltMin);
    }

    generateName () {
        let timeString = (new Date()).getTime();
        let shuffled = this.shuffle(timeString);
        return shuffled + '' + timeString;
    }
}
module.exports = {
    generateId: ()=> {
        return (new Date()).getTime() + Math.round(Math.random()*100);
    },

    passwordHash: (password)=> {
        return password_hash.generate(password);
    },

    passwordVerify: (password, hash)=> {
        return password_hash.verify(password, hash);
    },

    sessionHash: ()=> {

    }

};
