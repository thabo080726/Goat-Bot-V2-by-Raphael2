"use strict";

const utils = require("./utils");
const cheerio = require("cheerio");
const log = require("npmlog");

let checkVerified = null;

const defaultLogRecordSize = 100;
log.maxRecordSize = defaultLogRecordSize;

function setOptions(globalOptions, options) {
	Object.keys(options).map(function (key) {
		switch (key) {
			case 'pauseLog':
				if (options.pauseLog) log.pause();
				break;
			case 'online':
				globalOptions.online = Boolean(options.online);
				break;
			case 'logLevel':
				log.level = options.logLevel;
				globalOptions.logLevel = options.logLevel;
				break;
			case 'logRecordSize':
				log.maxRecordSize = options.logRecordSize;
				globalOptions.logRecordSize = options.logRecordSize;
				break;
			case 'selfListen':
				globalOptions.selfListen = Boolean(options.selfListen);
				break;
			case 'listenEvents':
				globalOptions.listenEvents = Boolean(options.listenEvents);
				break;
			case 'pageID':
				globalOptions.pageID = options.pageID.toString();
				break;
			case 'updatePresence':
				globalOptions.updatePresence = Boolean(options.updatePresence);
				break;
			case 'forceLogin':
				globalOptions.forceLogin = Boolean(options.forceLogin);
				break;
			case 'userAgent':
				globalOptions.userAgent = options.userAgent;
				break;
			case 'autoMarkDelivery':
				globalOptions.autoMarkDelivery = Boolean(options.autoMarkDelivery);
				break;
			case 'autoMarkRead':
				globalOptions.autoMarkRead = Boolean(options.autoMarkRead);
				break;
			case 'listenTyping':
				globalOptions.listenTyping = Boolean(options.listenTyping);
				break;
			case 'proxy':
				if (typeof options.proxy != "string") {
					delete globalOptions.proxy;
					utils.setProxy();
				} else {
					globalOptions.proxy = options.proxy;
					utils.setProxy(globalOptions.proxy);
				}
				break;
			case 'autoReconnect':
				globalOptions.autoReconnect = Boolean(options.autoReconnect);
				break;
			case 'emitReady':
				globalOptions.emitReady = Boolean(options.emitReady);
				break;
			default:
				log.warn("setOptions", "Unrecognized option given to setOptions: " + key);
				break;
		}
	});
}

function buildAPI(globalOptions, html, jar) {
	const maybeCookie = jar.getCookies("https://www.facebook.com").filter(function (val) {
		return val.cookieString().split("=")[0] === "c_user";
	});

	const objCookie = jar.getCookies("https://www.facebook.com").reduce(function (obj, val) {
		obj[val.cookieString().split("=")[0]] = val.cookieString().split("=")[1];
		return obj;
	}, {});

	if (maybeCookie.length === 0) {
		throw { error: "Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify." };
	}

	if (html.indexOf("/checkpoint/block/?next") > -1) {
		log.warn("login", "Checkpoint detected. Please log in with a browser to verify.");
	}

	const userID = maybeCookie[0].cookieString().split("=")[1].toString();
	const i_userID = objCookie.i_user || null;
	log.info("login", `Logged in as ${userID}`);

	try {
		clearInterval(checkVerified);
	} catch (_) { }

	const clientID = (Math.random() * 2147483648 | 0).toString(16);

	const oldFBMQTTMatch = html.match(/irisSeqID:"(.+?)",appID:219994525426954,endpoint:"(.+?)"/);
	let mqttEndpoint = null;
	let region = null;
	let irisSeqID = null;
	let noMqttData = null;

	if (oldFBMQTTMatch) {
		irisSeqID = oldFBMQTTMatch[1];
		mqttEndpoint = oldFBMQTTMatch[2];
		region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
	} else {
		const newFBMQTTMatch = html.match(/{"app_id":"219994525426954","endpoint":"(.+?)","iris_seq_id":"(.+?)"}/);
		if (newFBMQTTMatch) {
			irisSeqID = newFBMQTTMatch[2];
			mqttEndpoint = newFBMQTTMatch[1].replace(/\\\//g, "/");
			region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
		} else {
			const legacyFBMQTTMatch = html.match(/(\["MqttWebConfig",\[\],{fbid:")(.+?)(",appID:219994525426954,endpoint:")(.+?)(",pollingEndpoint:")(.+?)(3790])/);
			if (legacyFBMQTTMatch) {
				mqttEndpoint = legacyFBMQTTMatch[4];
				region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
				log.warn("login", `Cannot get sequence ID with new RegExp. Fallback to old RegExp (without seqID)...`);
				log.info("login", `Got this account's message region: ${region}`);
				log.info("login", `[Unused] Polling endpoint: ${legacyFBMQTTMatch[6]}`);
			} else {
				log.warn("login", "Cannot get MQTT region & sequence ID.");
				noMqttData = html;
			}
		}
	}

	const ctx = {
		userID: userID,
		i_userID: i_userID,
		jar: jar,
		clientID: clientID,
		globalOptions: globalOptions,
		loggedIn: true,
		access_token: 'NONE',
		clientMutationId: 0,
		mqttClient: undefined,
		lastSeqId: irisSeqID,
		syncToken: undefined,
		wsReqNumber: 0,
		wsTaskNumber: 0,
		reqCallbacks: {},
		mqttEndpoint,
		region,
		firstListen: true
	};

	const api = {
		setOptions: setOptions.bind(null, globalOptions),
		getAppState: function getAppState() {
			const appState = utils.getAppState(jar);
			return appState.filter((item, index, self) => self.findIndex((t) => { return t.key === item.key; }) === index);
		}
	};

	if (noMqttData) {
		api["htmlData"] = noMqttData;
	}

	const apiFuncNames = [
		'addExternalModule',
		'addUserToGroup',
		'changeAdminStatus',
		'changeArchivedStatus',
		'changeAvatar',
		'changeBio',
		'changeBlockedStatus',
		'changeGroupImage',
		'changeNickname',
		'changeThreadColor',
		'changeThreadEmoji',
		'createNewGroup',
		'createPoll',
		'deleteMessage',
		'deleteThread',
		'forwardAttachment',
		'getCurrentUserID',
		'getEmojiUrl',
		'getFriendsList',
		'getMessage',
		'getThreadHistory',
		'getThreadInfo',
		'getThreadList',
		'getThreadPictures',
		'getUserID',
		'getUserInfo',
		'handleFriendRequest',
		'handleMessageRequest',
		'listenMqtt',
		'logout',
		'markAsDelivered',
		'markAsRead',
		'markAsReadAll',
		'markAsSeen',
		'muteThread',
		'refreshFb_dtsg',
		'removeUserFromGroup',
		'resolvePhotoUrl',
		'searchForThread',
		'sendMessage',
		'sendTypingIndicator',
		'setMessageReaction',
		'setPostReaction',
		'setTitle',
		'threadColors',
		'unsendMessage',
		'unfriend',
		'uploadAttachment',
		'editMessage',
		'httpGet',
		'httpPost',
		'httpPostFormData'
	];

	const defaultFuncs = utils.makeDefaults(html, userID, ctx);

	apiFuncNames.map(v => api[v] = require('./src/' + v)(defaultFuncs, api, ctx));

	return [ctx, defaultFuncs, api];
}

function makeLogin(jar, email, password, loginOptions, callback, prCallback) {
	return function (res) {
		const html = res.body;
		const $ = cheerio.load(html);
		let arr = [];

		$("#login_form input").map((i, v) => arr.push({ val: $(v).val(), name: $(v).attr("name") }));

		arr = arr.filter(function (v) {
			return v.val && v.val.length;
		});

		const form = utils.arrToForm(arr);
		form.lsd = utils.getFrom(html, "[\"LSD\",[],{\"token\":\"", "\"}");
		form.lgndim = Buffer.from("{\"w\":1440,\"h\":900,\"aw\":1440,\"ah\":834,\"c\":24}").toString('base64');
		form.email = email;
		form.pass = password;
		form.default_persistent = '0';
		form.lgnrnd = utils.getFrom(html, "name=\"lgnrnd\" value=\"", "\"");
		form.locale = 'en_US';
		form.timezone = '240';
		form.lgnjs = ~~(Date.now() / 1000);

		const willBeCookies = html.split("\"_js_");
		willBeCookies.slice(1).map(function (val) {
			const cookieData = JSON.parse("[\"" + utils.getFrom(val, "", "]") + "]");
			jar.setCookie(utils.formatCookie(cookieData, "facebook"), "https://www.facebook.com");
		});

		return utils
			.post("https://www.facebook.com/login/device-based/regular/login/?login_attempt=1&lwv=110", jar, form, loginOptions)
			.then(utils.saveCookies(jar))
			.then(function (res) {
				const headers = res.headers;
				if (!headers.location) throw { error: "Wrong username/password." };

				if (headers.location.indexOf('https://www.facebook.com/checkpoint/') > -1) {
					log.info("login", "You have login approvals turned on.");
					const nextURL = 'https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php';

					return utils
						.get(headers.location, jar, null, loginOptions)
						.then(utils.saveCookies(jar))
						.then(function (res) {
							const html = res.body;
							const $ = cheerio.load(html);
							let arr = [];
							$("form input").map((i, v) => arr.push({ val: $(v).val(), name: $(v).attr("name") }));

							arr = arr.filter(function (v) {
								return v.val && v.val.length;
							});

							const form = utils.arrToForm(arr);
							if (html.indexOf("checkpoint/?next") > -1) {
								setTimeout(() => {
									checkVerified = setInterval((_form) => { }, 5000, {
										fb_dtsg: form.fb_dtsg,
										jazoest: form.jazoest,
										dpr: 1
									});
								}, 2500);
								throw {
									error: 'login-approval',
									continue: function submit2FA(code) {
										form.approvals_code = code;
										form['submit[Continue]'] = $("#checkpointSubmitButton").html();
										let prResolve = null;
										let prReject = null;
										const rtPromise = new Promise(function (resolve, reject) {
											prResolve = resolve;
											prReject = reject;
										});
										if (typeof code == "string") {
											utils
												.post(nextURL, jar, form, loginOptions)
												.then(utils.saveCookies(jar))
												.then(function (res) {
													const $ = cheerio.load(res.body);
													const error = $("#approvals_code").parent().attr("data-xui-error");
													if (error) {
														throw {
															error: 'login-approval',
															errordesc: "Invalid 2FA code.",
															lerror: error,
															continue: submit2FA
														};
													}
												})
												.then(function () {
													delete form.no_fido;
													delete form.approvals_code;
													form.name_action_selected = 'dont_save';

													return utils.post(nextURL, jar, form, loginOptions).then(utils.saveCookies(jar));
												})
												.then(function (res) {
													const headers = res.headers;
													if (!headers.location && res.body.indexOf('Review Recent Login') > -1) throw { error: "Something went wrong with login approvals." };

													const appState = utils.getAppState(jar);

													if (callback === prCallback) {
														callback = function (err, api) {
															if (err) return prReject(err);
															return prResolve(api);
														};
													}

													return loginHelper(appState, email, password, loginOptions, callback);
												})
												.catch(function (err) {
													if (callback === prCallback) prReject(err);
													else callback(err);
												});
										} else {
											utils
												.post("https://www.facebook.com/checkpoint/?next=https%3A%2F%2Fwww.facebook.com%2Fhome.php", jar, form, loginOptions, null, { "Referer": "https://www.facebook.com/checkpoint/?next" })
												.then(utils.saveCookies(jar))
												.then(res => {
													try {
														JSON.parse(res.body.replace(/for \(;;;\);\s*/, ""));
													} catch (ex) {
														clearInterval(checkVerified);
														log.info("login", "Verified from browser. Logging in...");
														if (callback === prCallback) {
															callback = function (err, api) {
																if (err) return prReject(err);
																return prResolve(api);
															};
														}
														return loginHelper(utils.getAppState(jar), email, password, loginOptions, callback);
													}
												})
												.catch(ex => {
													log.error("login", ex);
													if (callback === prCallback) prReject(ex);
													else callback(ex);
												});
										}
										return rtPromise;
									}
								};
							} else {
								if (!loginOptions
