// 미들웨어 기본틀
const jwt = require("jsonwebtoken"); //  jwt를 검증하기 위해 jwt 모듈 불러옴
const User = require("../models/user") // 실제로 데이터베이스와 비교해야하니까 유저사용자모델이 필요함


module.exports = (req, res, next) => {
    console.log("여기를 지나쳤어요!!!!"); // 미들웨어가 확실하게 호출이 되었고, 다음 핸들러가 호출되었다는것을 확신할 수 있음.
    const { authorization } = req.headers; // 아무리 프론트엔드에서 대문자로 보내도 여기서는 소문자로 변환됨;
    // console.log(authorization); // Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MTliZDk1YTdlOTA0NWI2YzhlNjIyNWIiLCJpYXQiOjE2Mzc2MDcwMDZ9.0HaMyqR2sfaWCmUe80SnnktBm4pWjvXds0udgmgHtLw
                                // 이것을 어떻게 하냐? 이 Bearer와 뒤에있는 데이터를 어떻게 가져옴?? > split 사용하자(공백스플릿)
    const [tokenType, tokenValue] = authorization.split(' ');
    console.log(tokenValue); // 우리가 원하는 값인지 확인해보자
    if (tokenType !== 'Bearer') { // 토큰타입이 Bearer 가 아니면 탈출시키는 것이 효율적이다.
        res.status(401).send({  
            errorMessage: '로그인 후 사용하세요',
        });
        return; // 이유 : 토큰타입이 Bearer가 아니면 무조건 로그인 후 사용하도록 return 처리하기.
    }

    try { //try구문안에서 에러발생하면 잡아서 catch구문으로 넘겨준다.
       // const decoded = jwt.verify(tokenValue, "my-secret-key"); // decoded에는 어떤 밸류가 들어있을까?
       const { userId } = jwt.verify(tokenValue, "my-secret-key");

        // Id는 고유하니까 findOne이랑 같음
       User.findById(userId).exec().then((user) => { 
            res.locals.user = user; // locals라는 공간에 지금 로그인 시도하는 user 정보를 담는다.
            next(); // 이 경우에만 next가 허용된다 !!
       }); // 미들웨어에서는 넥스트가 반드시 호출되어야함. 호출안되면 예외처리 걸려서 뒤에 미들웨어까지 연결이 안댐.

    //    if  (!user){ // 만약 토큰을 발급한 이후 탈퇴하거나 db에서 삭제되었으면(악성사용자) 에러내야함! 없다고 가정하자.
    //    }

    } catch (error) {
        res.status(401).send({
            errorMessage: '로그인 후 사용하세요',
        });
        return; // 위와 같은 이유 : 무조건 로그인 후 사용하도록 return 처리하기.
    }

};