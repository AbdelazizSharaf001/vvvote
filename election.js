/**
 * 
 * @param electionId
 * @returns {___ballot0}
 */

function makeBallotRaw(electionId, bits) {
	var ballot = new Object();
	ballot.electionId = electionId;
	ballot.votingno   = randBigInt(bits, 0);
	ballot.salt       = randBigInt(bits, 0);
	return ballot;
}


function addBallothash(ballot) {
	var transm = new Object();
	transm.str        = JSON.stringify(ballot);
	transm.hash   = SHA256(transm.str);
	return transm;
}


/**
 * @TODO use the smallest key size of all servers
 * attention: the bitsize of all permission server's keys must be equal 
 * @param electionId
 * @param numBallots
 * @param serverList
 * @param forServer Nummer des Servers, f�r den der Req erzeugt werden soll
 * @returns {Object}
 */

function makeBlindSigReqForFirstServer(election, forServer) {
	//var electionId, numBallots, serverList;
	var ballots = new Array();
	if (election.xthServer == 0) {
	for (var i=0; i<election.numBallots; i++) {
		var ballot = new Object();
		ballot.raw    = makeBallotRaw(election.electionId, bitSize(election.pServerList[0].key.n)); // attention: the bitsize of all permission servers must be equal
		ballot.transm = addBallothash(ballot.raw);
		ballot.blindingf = new Array();
		for (var j=0; j<election.pServerList.length; j++) {
			ballot.blindingf[j] = RsablindingFactorsGen(bitSize(election.pServerList[j].key.n) - 1, election.pServerList[j].key.n);
		}
		ballot.blindedHash    = new Array();
		ballot.blindedHash[0] = rsaBlind(ballot.transm.hash, ballot.blindingf[forServer], election.pServerList[forServer].key);
		ballot.sigBy     = new Array();
		ballot.sigBy[0]  = forServer;
		ballots[i]       = ballot;
	}
	election.ballots = ballots;
	return ballots;
	}
}

function makeBlindSigReqForOtherServers(ballots, serverList, forServer) {
	var prevSig;
	for (ballot in ballots) {
		if (sign in ballot.transm) {prevSig = ballot.transm.sign[ballot.transm.sign.length - 1]; }
		else                       {prevSig = ballot.transm.hash;}
		ballot.blinded[forServer] = rsaBlind(prevSig, ballot.blindingf[forServer], serverList[forServer].key);
	}
}


function makeFirstPermissionReqs(election) {
	// voterId, secret, electionId, numBallots, serverList
	//global base;
	election.pServerSeq = new Array();
	election.xthServer = 0;
	var forServer = getNextPermServer(election); 
	var ballots   = makeBlindSigReqForFirstServer(election, forServer); 
	var req = new Object();
	req.cmd = 'pickBallots';
	
	req.blindedHash = new Array();
	for (var i=0; i<election.numBallots; i++) {
		req.blindedHash[i] = bigInt2str(ballots[i].blindedHash[0], base);
	}
	req.xthServer      = election.xthServer;
	addCredentials(election, req);
	return JSON.stringify(req);
}

/*

function makePermissionReqs(voterId, secret, electionId, numBallots, serverList) {
	var serverSeq = new Array;
	var ballots = makeBlindSigReqForFirstServer(electionId, numBallots, serverList, nextServer);
	for (var s=0; s<serverList.lenght; s++) {
		var nextServer = getNextPermServer(serverSeq, serverList);
		serverSeq[s] = nextServer;
		makePermissionReq(voterId, secret, electionId, ballots, serverList); 
	}
	return JSON.stringify(req);
}
*/

function makeNextPermissionReq(){
	
}

/**
 * adds the credentials to the request Object
 * @param election
 * @param req
 * @returns
 */
function addCredentials(election, req) {
	req['voterId']    = election.voterId;
	req['secret']     = election.secret;
	req['electionId'] = election.electionId;
	return req;
}

function makePermissionReq(voterId, secret, electionId, ballots, serverList) {
	var req = new Object();
	for (var i=0; i<ballots.length; i++) {
		req.blindedHash[i] = ballots[i].blinded[ballots[i].blinded.length - 1];
	}
	req['voterId'] = voterId;
	req['secret']  = secret;
	return JSON.stringify(req);
}

function handleServerAnswer(election, dataString) {
	var data = JSON.parse(dataString);
	if ('errorno' in data) {
		alert ("Error occured: $data.errorno $data.text");
	} else {
		switch (data.cmd) {
		case 'unblindBallots':
			ret = unblindBallotsEvent(election, data);
			break;

		default:
			break;
		}
	}
	addCredentials(election, ret);
	return JSON.stringify(ret);
}


function unblindBallotsEvent(election, requestedBallots) {
	var ret = disclose(election, requestedBallots.picked, election.ballots, election.pServerSeq[election.pServerSeq.length - 1]);
	ret.cmd = 'signBallots';
	return ret;
}


// bigInt2str

function disclose(election, requestedBallots, ballots, forServer) {
	var transm = Object();
	transm.ballots = new Array();
	for (var i=0; i<requestedBallots.length; i++) {
		transm.ballots[i]            = new Object();
		transm.ballots[i].votingno   = bigInt2str(ballots[requestedBallots[i]].raw.votingno, base);
		transm.ballots[i].salt       = bigInt2str(ballots[requestedBallots[i]].raw.salt, base);
		transm.ballots[i].electionId = ballots[requestedBallots[i]].raw.electionId;
		transm.ballots[i].hash       = ballots[requestedBallots[i]].transm.hash;
		transm.ballots[i].unblindf   = bigInt2str(ballots[requestedBallots[i]].blindingf[forServer].unblind, base);
		transm.ballots[i].blindedHash = bigInt2str(ballots[requestedBallots[i]].blindedHash[election.xthServer], base); // TODO this is not needed to transmitt remove it before release
		if (ballots[requestedBallots[i]].transm.sigs) {
			for (var s=0; s<ballots[requestedBallots[i]].transm.sigs.length; s++) {
				transm.ballots[i].sigs[j]       = bigInt2str(ballots[requestedBallots[i]].transm.sigs[j], base);
				transm.ballots[i].sigBy[j]      = ballots[requestedBallots[i]].transm.sigBy[j];
			}
		}
	}
	return transm;
}


function getNextPermServer(election) {
	// var serverSeq, pServerList;
	for (var i=0; i<election.pServerList.length; i++) { 
		nextServer = Math.round((Math.random()*(election.pServerList.length - 1))); // find the next random server number
		var j = 0;
		while (election.pServerSeq.indexOf(nextServer) > 0 && j < election.pServerList.length) {
			nextServer++;
			j++;
			if (nextServer == election.pServerList.length) {nextServer = 0;}
		}
		if (j == election.pServerList.length) {return -1;}
	}
	election.pServerSeq.push(nextServer);
    return nextServer;
}

function makeUnblindedreqestedBallots(reqestedBallots, allBallots){
	var answer = new Array();
	for (var i=0; i<reqestedBallots.length; i++) {
		answer[i] = allBallots[reqestedBallots[i]]; 
	}
	return JSON.stringify(answer);
}

function verifySaveElectionPermiss(serverAnsw, ballots, serverKey) {
	// answ: array of signed: .num .blindSignatur .serverId
	var answ     = JSON.parse(serverAnsw); // decode answer
	for (var i=0; i<answ.length; i++) {
		var signatur = rsaUnblind(answ[i].blindSignatur, ballots[answ[i].num].blindingf, serverKey);  // unblind
		var testsign = RsaEncDec(signatur, serverKey);
		var signOk   = equals(testsign, ballots[answ[i].num].transm.hash);
		j = ballots[answ.num[i]].transm.blindsig.length;
		ballots[answ[i].num].transm.blindsig[j] = answ[i].blindSignatur;  
		ballots[answ[i].num].transm.sigs[j]     = signatur;
        ballots[answ[i].num].transm.sigBy[j]    = serverKey.serverId;
		ballots[answ[i].num].transm.signOk[j]   = signOk; 
	}
	return ballots;
}


function makeVote(ballots, numRequiredSignatures, vote) {
	var j = 0;
	var numsigners = 0;
	for (var i=0; i<ballots.length; i++) { // find the ballot that is signed by most permission servers
		if (ballots[i].transm.sign.length > numsigners) {
			numsigners = ballots[i].transm.sign.length;
			j = i;
		}
	}
	if (numsigners < numRequiredSignatures) {throw "Not enough permission signarures acquired";}
	votedballot      = ballots[j];
	votedballot.vote = vote;
	return votedballot; 
}

function getPermissionServerList() {
	// load config
	base = 16; // basis used to encode/decode bigInts
	var slist  = new Array();
	var server = new Object();
	var key    = new Object();
	server.name = 'PermissionServer1';
	server.url  = '';
	key.exp     = str2bigInt('65537', 10);  
	key.n       = str2bigInt('43572702632393812002389124439062643234946865623253726132688386065774781812747', 10);
	key.serverId = server.name;
	server.key = key; 
	slist[0] = server;
	server.name = 'PermissionServer2';
	slist[1] = server;
    return slist;	
}


/**
 * 
 * @param vote
 * @returns {___voteTransm2}
 */
function makeVoteTransm(vote) {
	var voteTransm = new Object();
	voteTransm.electionId = vote.electionId;
	voteTransm.votingno   = vote.votingno;
	voteTransm.salt       = vote.salt;
	voteTransm.signatures = vote.transm.sign;
	voteTransm.vote       = vote;
	return voteTransm;
}
