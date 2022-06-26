const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const MongoClient = require('mongodb').MongoClient;

const methodOverride = require('method-override');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : 'code', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

MongoClient.connect('mongodb+srv://root:go_159159159@cluster0.j1qgc.mongodb.net/todoapp?retryWrites=true&w=majority', function(er, client){
	app.listen(8080, function(){
		db = client.db('todoapp');
		console.log('listening on 8080')
	});
})

app.get('/name', function(req, res){
	res.send('닉네임');
});

app.get('/beauty', function(req, res){
	res.send('뷰티페이지');
});

app.get('/newpost', logincheck, function(req, res){
	res.render('write.ejs');
});

app.post('/add', logincheck, function(req, res){
	db.collection('counter').findOne({name : '게시물갯수'}, function(err, result){
		var totalPost = result.totalPost + 1
		db.collection('post').insertOne( {_id : totalPost, title : req.body.title ,contents : req.body.contents, writer : req.user.id} , function(err, result){
			console.log('저장완료'); 
			db.collection('post').find().toArray(function(err, postresult){
				db.collection('post').count(function(err, totalNumber){
					res.render('list.ejs', {name : postresult, number : totalNumber });
					console.log(postresult , totalNumber);
				});
			});
			db.collection('counter').updateOne({name : '게시물갯수'},{$inc : {totalPost : 1}});
		});
	});
});
app.get('/search', function(req, res){
	console.log(req.query.value)
	db.collection('post').find( { $text : { $search: req.query.value }} ).toArray(function(err, result){
		console.log(result);
		res.render('search.ejs', {name : result });
	})
});

app.get('/', function(req, res){
	db.collection('post').find().toArray(function(err, postresult){
		db.collection('post').count(function(err, totalNumber){
			res.render('list.ejs', {name : postresult, number : totalNumber });
			console.log(postresult , totalNumber);
		});
	});
});

app.delete('/delete',logincheck, function(req, respon){
	console.log(req.body.user);
	req.body._id = parseInt(req.body._id);
	if (req.body.user == req.user.id){
		db.collection('post').deleteOne({_id : req.body._id}, function(err, res){
			console.log('삭제 완료');
			respon.status(200).send({ message : '성공'});
		});
	} else {
		respon.send('본인의 게시물만 삭제 가능합니다.');
	}

});

app.get('/detail/:id',function(req, respon){
	db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
		console.log(result);
		if(result !== null){
			respon.render('detail.ejs', {data : result});
		} else {
			respon.send('404 Not Found');
		}
	});
});

app.get('/edit/:id', logincheck,function(req, respon){
	db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
		console.log(result);
		if(result !== null){
			if(result.writer == req.user.id){
				respon.render('edit.ejs', {data : result});
			} else {
				respon.send('본인의 글만 수정 가능합니다.');
			}
		} else {
			respon.send('404 Not Found');
		}
	});
});

app.post('/update/:id', function(req, respon){
	console.log(req.body);
	db.collection('post').updateOne({_id : parseInt(req.params.id)},{$set : {title : req.body.title ,contents : req.body.contents}}, function(err, result){
		console.log(result);
		if(result !== null){
			db.collection('post').find().toArray(function(err, postresult){
				db.collection('post').count(function(err, totalNumber){
					respon.render('list.ejs', {name : postresult, number : totalNumber });
					console.log(postresult , totalNumber);
				});
			});
		} else {
			respon.send('404 Not Found');
		}	
	});
});

app.get('/login', login, function(req, respon){
	respon.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
	failureRedirect : '/fail'
}), function(req, respon){
	respon.redirect('/')
});

passport.use(new LocalStrategy({
	usernameField: 'id',
	passwordField: 'pw',
	session: true,
	passReqToCallback: false,
  }, function (inid, inpw, done) {
	console.log(inid, inpw);
	db.collection('login').findOne({ id: inid }, function (err, result) {
	  if (err) return done(err)
  
	  if (!result) return done(null, false, { message: '존재하지않는 아이디입니다.' })
	  if (inpw == result.pw) {
		return done(null, result)
	  } else {
		return done(null, false, { message: '비밀번호가 올바르지 않습니다.' })
	  }
	})
  }));

passport.serializeUser(function(user, done){
	done(null, user.id)
});
passport.deserializeUser(function(id, done){
	db.collection('login').findOne({id : id}, function(err, result){
		done(null, result)
	});
});

app.get('/mypage', logincheck, function(req, respon){
	respon.render('mypage.ejs', {user : req.user});
	console.log(req.user);
});

function login(req, res, next){
	if (req.user){
		res.send('이미 로그인이 되어있습니다.')
	} else {
		next()
	}
};

function logincheck(req, res, next){
	if (req.user){
		next()
	} else {
		res.send('로그인이 필요합니다.')
	}
};