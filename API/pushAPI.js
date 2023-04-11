const Admin = require("../molde/Admin");
const product = require("../molde/product");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const jimp = require("jimp");
const path = require("path");
var jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
// const passport = require('passport');
// const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require("cookie-parser");

const app = express();
app.use(bodyParser.json());
app.use(
  session({
    secret: "sassa2",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// update image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    ); // tên file
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // giới hạn kích thước file tải lên là 2MB
});

app.post("/dangkyAdmin", upload.single("image"), async (req, res) => {
  try {
    console.log(req.body);
    const email = req.body.email;
    const password = req.body.passWord;
    const name = req.body.name;
    const role = req.body.role;
    const filename = req.file ? req.file.filename : null; // kiểm tra xem req.file có tồn tại hay không
    const checkEmail = await Admin.findOne({ email: email });
    if (checkEmail) {
      const err = "Email đã tồn tại !";
      res.status(400).send(err);
      res.render("dangky", {
        error: err,
      });
    } else {
      const imagePath = req.file.path;
      const img = await jimp.read(imagePath);
      const baseImage = await img.getBase64Async(jimp.AUTO);
      const admin = new Admin({
        email: email,
        passWord: password,
        name: name,
        role: role,
        image: baseImage,
      });

      await admin.save();
      res.redirect("/admin/loginAdmin");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/loginAdmin", async (req, res) => {
  res.render("login");
});

/// Admin
app.get("/", (req, res) => {
  res.render("dangky");
});
app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const pass = req.body.passWord;
    let user = await Admin.findOne({ email: email });
    if (!user) {
      const err = "Email không tồn tại !";
      res.status(400).send(err);
      res.render("login", {
        error: err,
      });
    } else {
      user.comparePassword(req.body.passWord, function (err, isMatch) {
        if (!err && isMatch) {
          // if user is found and password is right create a token
          const token = jwt.sign({ user }, "nodeauthsecret", {
            expiresIn: "15m",
          });
          res.cookie("token", token, { httpOnly: true });
          req.session.user = {
            email: user.email,
            passWord: user.passWord,
            role: user.role,
            image: user.image,
            _id: user._id,
            name: user.name,
            pass: pass,
          };
          res.redirect("/admin/home");
        } else {
          const err = "Mật khẩu không chính xác !";
          res.status(err).send(err);
          res.render("login", {
            error: err,
          });
        }
      });
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/admin/loginAdmin");
  }

  jwt.verify(token, "nodeauthsecret", function (err, decoded) {
    if (err) {
      return res.redirect("/admin/loginAdmin");
    }
    req.user = decoded.user;
    next();
  });
}

app.get("/home", verifyToken, (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect("/admin/loginAdmin");
  } else {
    if (req.session.user.role === "admin") {
      res.redirect("/admin/getAllUsers");
    } else {
      res.redirect("/admin/getInformation");
    }
  }
});

/// users
app.get("/getUsers", verifyToken, async (req, res) => {
  try {
    const users = await Admin.find({});
    res.json(users);
    //   res.render("managerUser", {
    //      users: users.map(user => user.toJSON()),
    //   })
  } catch (error) {
    console.log(error);
  }
});

app.get("/delete/:id", verifyToken, async (req, res) => {
  try {
    const u = await Admin.findByIdAndDelete(req.params.id, req.body);
    if (!u) {
      res.status(404).send("no items found");
    } else {
      res.status(200).redirect("/admin/getAllUsers");
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/edit/:id", verifyToken, async (req, res) => {
  try {
    await Admin.findById(req.params.id).then((user) => {
      res.render("editUser", {
        user: user.toJSON(),
      });
    });
  } catch (error) {
    console.log(error);
  }
});

app.put("/inserUsers/:id", verifyToken, (req, res) => {
  Admin.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.redirect("/admin/getAllUsers"))
    .catch((err) => console.error(err));
});

app.get("/addUsers", verifyToken, (req, res) => {
  res.render("addUser", {
    titleView: "Inserter User",
  });
});
app.post("/inserUsers", verifyToken, async (req, res) => {
  try {
    const user = new Admin(req.body);
    await user.save();
    res.redirect("/admin/getAllUsers");
  } catch (error) {
    res.status(500).send(error);
  }
});
app.get("/user", verifyToken, async (req, res) => {
  try {
    const user = Admin.find({});
    user.find({}).then((users) => {
      res.render("managerUser", {
        users: users.map((user) => user.toJSON()),
      });
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/product", verifyToken, (req, res) => {
  res.redirect("/admin/getAllProducts");
});

//Product

app.get("/getAllProducts", verifyToken, (req, res) => {
  product.find({}).then((product) => {
    res.render("managerProduct", {
      product: product.map((products) => products.toJSON()),
    });
  });
});

app.get("/addProduct", verifyToken, (req, res) => {
  res.render("addProduct", {
    titleView: "Inserter Products",
  });
});

app.post("/inserProduct", verifyToken, async (req, res) => {
  try {
    const products = new product(req.body);
    await products.save();
    res.redirect("/admin/getAllProducts");
  } catch (error) {
    res.status(500).render(error);
  }
});

app.get("/deleteProduct/:id", verifyToken, async (req, res) => {
  try {
    const ps = await product.findByIdAndDelete(req.params.id, req.body);
    if (!ps) {
      res.send("not found product");
    } else {
      res.redirect("/admin/getAllProducts");
    }
  } catch (error) {
    res.status(500).render(error);
  }
});

app.get("/editProduct/:id", verifyToken, async (req, res) => {
  try {
    await product.findById(req.params.id).then((products) => {
      res.render("updateProduct", {
        titleView: "Update Product",
        products: products.toJSON(),
      });
    });
  } catch (error) {
    res.status(500).render(error);
  }
});

app.put("/updateProduct/:id", verifyToken, (req, res) => {
  product
    .updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).redirect("/admin/getAllProducts"))
    .catch((error) => res.status(500).render(error));
});

// search users

app.get("/search", verifyToken, async (req, res) => {
  try {
    const name = req.query.search;
    const users = await Admin.find({ name: { $regex: name, $options: "i" } });

    res.render("managerUser", { users: users.map((user) => user.toJSON()) });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// get Information user

app.get("/getInformation", verifyToken, async (req, res) => {
  try {
    const user = req.session.user;
    if (user) {
      res.render("informationUser", {
        user: user,
      });
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/editInformation/:id", verifyToken, async (req, res) => {
  try {
    const u = await Admin.findById(req.params.id);
    res.render("editInformation", {
      titleView: "Update Information",
      user: u.toJSON(),
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/updateInfor/:id", verifyToken, async (req, res) => {
  Admin.updateOne({ _id: req.params.id }, req.body)
    .then(() => {
      res.redirect("/admin/getAllInfor");
    })
    .catch((err) => console.log(err));
});

app.get("/getAllInfor", verifyToken, async (req, res) => {
  try {
    const user = req.session.user;
    await Admin.findById({ _id: user._id }).then((user) => {
      res.render("informationUser", {
        user: user.toJSON(),
      });
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// logout
app.get("/logout", function (req, res) {
  res.clearCookie("token");
  res.redirect("/admin/loginAdmin");
});

module.exports = app;
