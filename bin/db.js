/**********************************************************

		File name   : db.js
        Description : Connect to database
                      Using mangodb as project default db

DATE	    PROGRAMMER		COMMENT
19/03/18    rbnishant       INITIAL VERSION

**********************************************************/

var MongoClient = require("mongodb").MongoClient;

var db = null;

module.exports = {
    connect: function (url, done) {
        if (db) {
            return done(null, db);
        }
        
        MongoClient.connect(url, function (err, result) {
            if (err) {
                return done(err);
            }
            
            db = result;
            done(null, db);
        })
    },
    
    get: function () {
        return db.db('wandx');
    }, 
    
    close: function (done) {
        if (!db) {
            return done(null);
        }
        
        db.close(function (err, result) {
            if (err) {
                return done(err);
            }
            
            db = null;
            done(null);
        })
    }
}