module.change_code = 1;

'use strict';

var alexa = require( 'alexa-app' );
var config  = require( './config' );
var levenshtein = require('fast-levenshtein');
var app = new alexa.app( 'mint-check' );


app.launch( function( request, response ) {
	response.say( 'Welcome to Mint Account Balance Checker.' ).reprompt( 'Say Check Balance of account name to get its balance or say list accounts to hear all options' ).shouldEndSession( false );
} );

app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);
	
	handleError(response,exception);
};


app.intent( 'listAccountsIntent', {
	"slots": {},
	"utterances": [
		"list accounts",
		"get accounts",
		"my accounts",
		"name accounts",
	] }, function( request, response ) {
	
		console.log('List accounts invoked');
		
		var responseString = 'Your accounts are. ';
		
		getMintData(config.username,config.password,function(success,error,mintAccounts){
			console.log('Got Mint Data!');
			
			if(success == false)
			{
				handleError(response,error);
			}
			else
			{		
				var index = 1;
				
				console.log('Iterating mint accounts');
				
				mintAccounts.forEach(function(account) {
					responseString += index + '. ' + account.fiLoginDisplayName + ' ' + account.accountName + '. ';
					index++;
				});
				
				console.log('Sending Response ' + responseString);
				
				response.say( responseString ).send();	
			}
		});
		
		return false;
	}
);

app.intent( 'refreshData', {
	"slots": {},
	"utterances": [
		"refresh data",
		"reload data",
		"update accounts",
	] }, function( request, response ) {
	
		getMintData(config.username,config.password,function(success,error,mintAccounts){
			if(success == false)
			{
				handleError(response,error);
			}
			else
			{		
				response.say( 'Reloaded data for ' +  mintAccounts.length + ' accounts').send();	
			}
		});
		
		return false;
			
	}
);

app.intent( 'listAllBalances', {
	"slots": {},
	"utterances": [
		"list all",
		"get all",
		"read all",
	] }, function( request, response ) {
	
		getMintData(config.username,config.password,function(success,error,mintAccounts){
			if(success == false)
			{
				handleError(response,error);
			}
			else
			{		
				var responseString = '';
				mintAccounts.forEach(function(account) {
					
					responseString += 'The balance of account ' + account.fiLoginDisplayName + ' is ' +  account.value + ' ' + account.currency + '. ';
				});
				response.say(responseString).send();
			}
		});
		
		return false;
			
	}
);


app.intent( 'getBalanceIntent', {
	"slots": {
		"Account": "ACCOUNT_NAME",
	},
	"utterances": [
		"get balance of {!ACCOUNT_NAME|Account}",
		"check balance {!ACCOUNT_NAME|Account}",
		"{!ACCOUNT_NAME|Account}",
	] }, function( request, response ) {
				
		//the name of the account the person wants to get the balance for.
		var requestedAccount = request.slot('Account');
		
		console.log('Looking for an account with the name ' + requestedAccount);
		
		//container to hold data of requested account when/if it is found.
		var requestedAccountData = new Object();

		getMintData(config.username,config.password,function(success,error,mintAccounts){
			//iterate over the accounts and attempt to find the one the user wants.
			
			if(success == false)
			{
				handleError(response,error);
			}
			else
			{
				var bestMatchIndex = -1;
				var bestMatchScore = 100;
				var currentIndex = 0;
				var requestedAccountData;
				
				mintAccounts.forEach(function(account) {
					var checkAccount = account.fiName.toLowerCase();
					
					var thisScore = levenshtein.get(checkAccount, requestedAccount);
					
					if(thisScore < bestMatchScore)
					{
						bestMatchIndex = currentIndex;
						bestMatchScore = thisScore;
					}
				});
				
				if(bestMatchScore < 5 && bestMatchIndex != -1)
				{
					requestedAccountData = mintAccounts[bestMatchIndex];
				}
		
				//read off the balance.
		
				if(bestMatchIndex != -1)
				{
					response.say( 'The balance of account ' + requestedAccountData.fiLoginDisplayName + ' is ' +  requestedAccountData.value + ' ' + requestedAccountData.currency + ' last updated ' + requestedAccountData.lastUpdatedInString + ' ago').send();
				}
				else
				{
					response.say( 'Sorry I could not find an account with the name ' + requestedAccount + '. Please ask again with another account name').send().shouldEndSession(false);
				}
			}
		});
		
		return false;
	}
);

app.intent( 'AMAZON.HelpIntent', {
	"slots": {},
	"utterances": []
	}, function( request, response ) {
		response.say( 'This is an application for checking the balances of your accounts through Mint.com. You can get a listing of your accounts by saying list accounts, or check a balance by saying get balance and the name of the account' ).shouldEndSession( false );
	}
);

function getMintData(username,password,callback)
{
	var mintAccountArray = [];
	require('pepper-mint')(username, password).then(function(mint) {
		console.log(username + " logged in...");
	 
		return mint.getAccounts();
	}).then(function(accounts) {
		console.log('Got ' + accounts.length + '  accounts');
		accounts.forEach(function(account){
			if(account.isActive)
			{
				mintAccountArray.push(account);
			}
		});
		

		if(typeof callback == 'function')
		{
			callback(true,{},mintAccountArray);		
		}
	}).fail(function(err) {
		callback(false,err,mintAccountArray);
	})
	
	
}

function handleError(response,error)
{
	response.say( 'Sorry an error occured ' + error.message);
}
module.exports = app;
