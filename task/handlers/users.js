const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    UserLogin,
    userSignUp,
    validate
} = require("../pkg/users/validate");

const users = require("../pkg/users");
const config = require("../pkg/config");

const register = async(req, res) => {
    try{
        await validate(req.body, userSignUp);
        const exists = await users.getByUsername(req.body.username);
        if(exists){
            return res.status(400).send("User with this username already exists!");
        }
        req.body.password = bcrypt.hashSync(req.body.password);
        const usr = await users.create(req.body);
        return res.status(201).send(usr);
    }catch(err){
        console.log(err);
        return res.status(err.status).send(err.error);
    }
}

const login = async(req, res) => {
    try{
        await validate(req.body, UserLogin);

        const {username, password} = req.body;

        const user = await users.getByUsername(username);

        if (!user){
            return res.status(400).send("User not found!");
        }

        if(!bcrypt.compareSync(password, user.password)){
            return res.status(400).send("Incorect password");
        }

        const payload = {
            
            fullname: user.fullname,
            username: user.username,
            id: user._id,
            expiry: new Date().getTime()/ 1000 + 7 * 24 * 60 * 60
        }
        const token = jwt.sign(payload, config.getSection("development").jwt);
        return res.status(200).send(token);

    }catch(err){
        console.log(err);
        return res.status(err.status).send(err.error);
    }
}

const resetPassword = async (req, res) => {
    await validate(req.body, UserReset);
    const {username, old_password, new_password} = req.body;
    const userAccount = await users.getByUsername(username)

    if(!bcrypt.compareSync(old_password, userAccount.password)){
        return res.status(400).send("Incorect password");
    }

    const newPasswordHashed = bcrypt.hashSync(new_password)
    if(old_password === new_password){
        return res.status(400).send("New password cannot be the same as the old password");
    }

    const passwordChanged = await users.setNewPassword(
        userAccount._id.toString(),
        newPasswordHashed
    );

    return res.status(200).send(passwordChanged);

}

const refreshToken = async(req, res) => {
    
    const payload = {
        ...req.auth,
        exp: new Date().getTime()/ 1000 + 7 * 24 * 60 * 60
    }

    const token = jwt.sign(payload, config.getSection("development").jwt);
        return res.status(200).send(token);
};

module.exports = {
    login,
    register,
    resetPassword,
    refreshToken,
}