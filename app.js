const express = require("express"); // express 모듈 불러오기
const mongoose = require("mongoose"); // mongoose 모듈 불러오기
const jwt = require("jsonwebtoken"); // jwt 모듈 불러오기
const Joi = require('joi');
const User = require("./models/user");
const authMiddleware = require("../middlewares/auth-middleware"); // 미들웨어 불러오기

mongoose.connect("mongodb://localhost/shopping-demo", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

const app = express();
const router = express.Router();


// 회원가입post에 대하여 Joi 유효성검증
const postUsersSchema = Joi.object({ //스키마정의하기
    nickname: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
})
// 회원가입 API--------------------------------------
router.post("/users", async (req, res) => { // 포스트메소드, 경로는 /users 
    try {
        const { nickname, email, password, confirmPassword } = await postUsersSchema.validateAsync(req.body); // Joi스키마 정의된 것으로 유효성검증
        
        if (password !== confirmPassword) { // 다르면 에러 만들기
        
            res.status(400).send({ // 400이하는 정상코드로 인식, 400의 뜻 Bad Request. 일반적으로 400(Bad Request)으로 잡는다.
            errorMessage: '패스워드가 패스워드 확인란과 동일하지 않습니다.',
            });
            return; // 패스워드가 다르더라도 아래 코드가 실행되지 않도록 return처리해준다. return처리 = 이 이벤트 핸들러에서 나가버림
        }
    //저장하면 되는데 이메일,닉네임 db와 일치하는 값 있으면 안되니까 확인하기
    // 굳이 사용자한테 안말함. db에 어떤 값이 있는지 알려주는 꼴

        const existUsers = await User.find({ // 확인하기
            $or: [{ email }, { nickname }], // 이메일이 겹치거나 닉네임이 겹치거나 하면
        });

        if (existUsers.length) {
            res.status(400).send({ //이메일이 겹치거나 닉네임이 겹치거나 하면 에러메세지를 내준다.
                errorMessage: '이미 가입된 이메일 또는 닉네임이 있습니다.', 
            });
            return; // 에러가 났으면 어차피 끝난거임 
        }

        const user = new User({ email, nickname, password}); //위에 둘다 에러가 안났을 시에는 저장 작업하기

        await user.save(); // 사용자 저장하기

        res.status(201).send({}); // 그냥 send는 200의 값을 반환해서 이상은 없는데, rest api 원칙에 따르면 201(created) 보내기
    
    } catch (err) {
        console.log(err);
        res.status(400).send({
            errorMessage: "요청한 회원가입 데이터 형식이 올바르지 않습니다."
        })
    }
});
    

const postAuthSchema = Joi.object({ //스키마정의하기
    email: Joi.string().email().required(),
    password: Joi.string().required(),
})
//로그인 API------------------------------------------------
router.post("/auth", async (req, res) => { //로그인api 작성준비
    try {
        const { email, password } = await postAuthSchema.validateAsync(req.body);

        const user = await User.findOne({ email, password }).exec(); // 두 값이 일치하는 사용자가 있는지 확인한다.

        if(!user) { //유저가없다면
            res.status(400).send({  // 에러메시지 내기. 401도 인증실패라 둘다 맞다. 
            errorMessage: '불친절하게 둘중 하나가 잘못되었습니다.', // 불친절하게 다알려주지 말자
            });
            return; // 에러났으면 리턴해야함
        }
        // 사용자가 있는경우 토큰을 만든다. 위쪽 모듈 불러왔는지 체크하고
        const token = jwt.sign({ userId: user.userId }, "my-secret-key"); // sign을 해야 토큰을 만들 수 있음. 
        res.send ({ // 토큰만들었으면 응답하면됨.
            token, // 응답할때도 token 이라는 key에 jwt token을 반환해야 프론트에서 정상동작하도록 해놓음. 
        });
        // 로그인은 됨. 알 수 없는 문제 발생.새로 프로젝트를 만들다보니 다른 api가실패해서 그렇다.
        // 그 중 내정보조회 api가 실패해서 그렇다.
        // 내정보조회 api를 만들기 이전에 사용자 인증 미들웨어를 구현해야한다.
        // 그러면 내정보조회 api 만들기 쉬움!! 자세한건 나중에 알려준댜
    } catch (error) {
        res.status(400).send({
        errorMessage: "요청한 로그인 데이터 형식이 올바르지 않습니다."
        })
    }
});
//미들웨어 ---------------------------------
//미들웨어를 붙이는 방법은 다양하다!!!!

// 아까 알수없는 문제 발생시에 get이었고 경로는 /users/me 였음.
router.get("/users/me", authMiddleware, async (req, res) => { //요 경로로 들어오는 경우에만 미들웨어가 붙는다!!
    const { user } = res.locals; // (json형식으로 유저정보 나타냄)
    console.log(user); //미들웨어를 거쳐와야 정보가 담김 
    // res.status(400).send({ // 테스트용 아깐 404였는데 이 코드 작성후 확인했을 때에는 400이 떴다. 작동상태 확인완료, 하지만 아무런 영향을 끼치지는 못하는 것도 확인
    res.send({    
        user: { // 가지고 있는 정보들 중에서 중요한 정보 빼고 클라이언트에게 전송한다.
        email: user.email,
        nickname: user.nickname,
        }
    }); 
});

/**
 * 내가 가진 장바구니 목록을 전부 불러온다.
 */
router.get("/goods/cart", authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;

  const cart = await Cart.find({
    userId,
  }).exec();

  const goodsIds = cart.map((c) => c.goodsId);

  // 루프 줄이기 위해 Mapping 가능한 객체로 만든것
  const goodsKeyById = await Goods.find({
    _id: { $in: goodsIds },
  })
    .exec()
    .then((goods) =>
      goods.reduce(
        (prev, g) => ({
          ...prev,
          [g.goodsId]: g,
        }),
        {}
      )
    );

  res.send({
    cart: cart.map((c) => ({
      quantity: c.quantity,
      goods: goodsKeyById[c.goodsId],
    })),
  });
});

/**
 * 장바구니에 상품 담기.
 * 장바구니에 상품이 이미 담겨있으면 갯수만 수정한다.
 */
router.put("/goods/:goodsId/cart", authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;
  const { goodsId } = req.params;
  const { quantity } = req.body;

  const existsCart = await Cart.findOne({
    userId,
    goodsId,
  }).exec();

  if (existsCart) {
    existsCart.quantity = quantity;
    await existsCart.save();
  } else {
    const cart = new Cart({
      userId,
      goodsId,
      quantity,
    });
    await cart.save();
  }

  // NOTE: 성공했을때 응답 값을 클라이언트가 사용하지 않는다.
  res.send({});
});

/**
 * 장바구니 항목 삭제
 */
router.delete("/goods/:goodsId/cart", authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;
  const { goodsId } = req.params;

  const existsCart = await Cart.findOne({
    userId,
    goodsId,
  }).exec();

  // 있든 말든 신경 안쓴다. 그냥 있으면 지운다.
  if (existsCart) {
    existsCart.delete();
  }

  // NOTE: 성공했을때 딱히 정해진 응답 값이 없다.
  res.send({});
});

/**
 * 모든 상품 가져오기
 * 상품도 몇개 없는 우리에겐 페이지네이션은 사치다.
 * @example
 * /api/goods
 * /api/goods?category=drink
 * /api/goods?category=drink2
 */
router.get("/goods", authMiddleware, async (req, res) => {
  const { category } = req.query;
  const goods = await Goods.find(category ? { category } : undefined)
    .sort("-date")
    .exec();

  res.send({ goods });
});

/**
 * 상품 하나만 가져오기
 */
router.get("/goods/:goodsId", authMiddleware, async (req, res) => {
  const { goodsId } = req.params;
  const goods = await Goods.findById(goodsId).exec();

  if (!goods) {
    res.status(404).send({});
  } else {
    res.send({ goods });
  }
});


app.use("/api", express.urlencoded({ extended: false }), router);
app.use(express.static("assets"));

app.listen(8080, () => {
  console.log("서버가 요청을 받을 준비가 됐어요");
});
