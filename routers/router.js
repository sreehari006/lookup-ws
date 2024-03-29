const Board = require('../models/board-model');
const uuidv1 = require('uuid/v1');
const constants = require('../constants/constants');
const admin = require('firebase-admin');

var serviceAccount = require('../lookup360.json');

var firebaseAdmin = admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: process.env.FIREBASE_DB_URL
});

var boards = new Map();

createBoard = (ws, msg, user) => {
	let board = new Board({ boardName: msg.boardName, author: user });
	board.save()
	.then(item => {
		var reply = {		
			'status': constants.SUCCESS,
			'replyFor': constants.CREATE_BOARD,
			'reply': {
				'boardID': item._id
			}
		};
		ws.send(JSON.stringify(reply));
	})
	.catch(err => {
		var reply = {	
			'status': constants.FAILURE,
			'replyFor': constants.CREATE_BOARD,
			'reply': 'Oops! Something went wrong. Try again please.'
		};
		ws.send(JSON.stringify(reply));
	});	
}

joinBoard = (ws, msg, user) => {
	Board.findById(msg.boardID, function (err, item) {
		if(err) {
			var reply = {		
				'status': constants.FAILURE,
				'replyFor': constants.JOIN_BOARD,
				'reply': 'Oops! Something went wrong. Try again please.'
			};
			ws.send(JSON.stringify(reply));
		} else {
			if(!boards.has(msg.boardID)) {				
				boards.set(msg.boardID, new Map());
			}
			var clients = boards.get(msg.boardID);
			clients.set(ws.id, ws);
			
			var reply = {		
				'status': constants.SUCCESS,
				'replyFor': constants.JOIN_BOARD,
				'reply': item
			};
			
			ws.send(JSON.stringify(reply));
		}
	});	
}

addSection = (ws, msg, user) => {
	var section = {
		'section': msg.sectionName,
		'author': user
	}
		
	var query = { _id: msg.boardID };
	var update = { $push : {'sections' : section}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.ADD_SECTION, query, update, options);
	
}

postLikesOnSection = (ws, msg, user) => {
	var like = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID };
	var update = { $push : {'sections.$.likes' : like}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_LIKES_ON_SECTION, query, update, options);
	
}

postDislikesOnSection = (ws, msg, user) => {
	var dislike = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID };
	var update = { $push : {'sections.$.dislikes' : dislike}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_DISLIKES_ON_SECTION, query, update, options);
	
}

postCards = (ws, msg, user) => {
	var post = {
		'post': msg.post,
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID };
	var update = { $push : {'sections.$.posts' : post}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_CARDS, query, update, options);
	
}

postCommentOnCards = (ws, msg, user) => {
	var comment = {
		'comment': msg.comment,
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID,  'sections.posts._id': msg.postID};
	var update = { $push : {'sections.0.posts.$.comments' : comment}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_COMMENT_ON_CARDS, query, update, options);
}

postClapsOnCards = (ws, msg, user) => {
	var claps = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID,  'sections.posts._id': msg.postID};
	var update = { $push : {'sections.0.posts.$.claps' : claps}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_CLAPS_ON_CARDS, query, update, options);
}


postDisagreeOnCards = (ws, msg, user) => {
	var disagree = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID,  'sections.posts._id': msg.postID};
	var update = { $push : {'sections.0.posts.$.disagree' : disagree}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_DISAGREE_ON_CARDS, query, update, options);
}

postClapsOnComments = (ws, msg, user) => {
	var claps = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID,  'sections.posts._id': msg.postID, 'sections.posts.comments._id': msg.commentID};
	var update = { $push : {'sections.0.posts.0.comments.$.claps' : claps}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_CLAPS_ON_COMMENTS, query, update, options);
}


postDisagreeOnComments = (ws, msg, user) => {
	var disagree = {
		'author': user
	}
		
	var query = { '_id': msg.boardID, 'sections._id': msg.sectionID,  'sections.posts._id': msg.postID, 'sections.posts.comments._id': msg.commentID};
	var update = { $push : {'sections.0.posts.0.comments.$.disagree' : disagree}};
	var options = {new: true, useFindAndModify: false};
	
	updateBoard(msg.boardID, constants.POST_DISAGRE_ON_COMMENTS, query, update, options);
}


updateBoard = (boardID, actionString, query, update, options) => {
	Board.findOneAndUpdate(query, update, options, function(err, doc){
		if(err) {
			var reply = {	
				'status': constants.FAILURE,
				'replyFor': actionString,
				'reply': 'Oops! Something went wrong. Try again please.'
			};
			ws.send(JSON.stringify(reply));
		} else {
			var reply = {	
				'status': constants.SUCCESS,
				'replyFor': actionString,
				'reply': doc
			};
			
			if(boards.has(boardID)) {
				var clients = boards.get(boardID);
				clients.forEach(function (client) {
					client.send(JSON.stringify(reply));
				});
			}
		}
	});
}

unknownAction = (ws) => {
	var reply = {		
		'status': constants.FAILURE,
		'replyFor': constants.UNKNOWN_ACTION,
		'reply': 'Unknown Action.'
	};
	ws.send(JSON.stringify(reply));
}

unauthorized = (ws) => {
	var reply = {		
		'status': constants.FAILURE,
		'replyFor': constants.UNAUTHORIZED,
		'reply': 'Unauthorized'
	};
	ws.send(JSON.stringify(reply));
}

exports.app =  function(ws, req) {
  ws.on('message', function(msg) {	
	var meta = JSON.parse(msg);  
	admin.auth().verifyIdToken(meta.token)
	.then(function(decodedToken) {	
		  var user = {
			  'displayName': decodedToken.name,
			  'pic': decodedToken.picture,
			  'uid': decodedToken.uid
		  }
		  if(meta.action == constants.CREATE_BOARD) {
			  createBoard(ws, meta.body, user);
		  } else if(meta.action == constants.JOIN_BOARD) {
			  joinBoard(ws, meta.body, user);
		  } else if(meta.action == constants.ADD_SECTION) {
			  addSection(ws,meta.body, user);
		  } else if(meta.action == constants.POST_LIKES_ON_SECTION) {
			  postLikesOnSection(ws, meta.body, user);
		  } else if(meta.action == constants.POST_DISLIKES_ON_SECTION) {
			  postDislikesOnSection(ws, meta.body, user);
		  } else if(meta.action == constants.POST_CARDS) {
			  postCards(ws, meta.body, user);
		  } else if(meta.action == constants.POST_COMMENT_ON_CARDS) {
			  postCommentOnCards(ws, meta.body, user);
		  } else if(meta.action == constants.POST_CLAPS_ON_CARDS) {
			  postClapsOnCards(ws, meta.body, user);
		  } else if(meta.action == constants.POST_DISAGREE_ON_CARDS) {
			  postDisagreeOnCards(ws, meta.body, user);
		  } else if(meta.action == constants.POST_CLAPS_ON_COMMENTS) {
			  postClapsOnComments(ws, meta.body, user);
		  } else if(meta.action == constants.POST_DISAGRE_ON_COMMENTS) {
			  postDisagreeOnComments(ws, meta.body, user);
		  } else {
			  unknownAction(ws);
		  }
	}).catch(function(error) {
		unauthorized(ws);
	});	  
  });
  
  ws.on('close', () => {
	console.log('disconnected: ');
  });  
  
}


