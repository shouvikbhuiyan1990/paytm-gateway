require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const formidable = require('formidable');
const path = require('path');
const https =  require('https');
var PaytmChecksum = require("PaytmChecksum");

const app = new express();

app.use(express.static(path.join(__dirname, '../build')));
app.use(bodyParser.json());
app.use(cors());


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

app.post('/callback', (req, res) => {

    const form = new formidable.IncomingForm();

    console.log('inside',  req);
    form.parse(req, (err, fields, file) => {
 
        let paytmChecksum = fields.CHECKSUMHASH;
        delete fields.CHECKSUMHASH;      

        var isVerifySignature = PaytmChecksum.verifySignature(fields, process.env.PAYTM_MERCHANT_KEY, paytmChecksum); 
        if (isVerifySignature) {
            var paytmParams = {};
            paytmParams["MID"] = fields.MID;
            paytmParams["ORDERID"] = fields.ORDERID;

            /*
            * Generate checksum by parameters we have
            * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
            */
            PaytmChecksum.generateSignature(paytmParams, process.env.PAYTM_MERCHANT_KEY).then(function (checksum) {

                paytmParams["CHECKSUMHASH"] = checksum;

                var post_data = JSON.stringify(paytmParams);

                var options = {

                    /* for Staging */
                    hostname: 'securegw-stage.paytm.in',

                    /* for Production */
                    // hostname: 'securegw.paytm.in',

                    port: 443,
                    path: '/order/status',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': post_data.length
                    }
                };

                var response = "";
                var post_req = https.request(options, function (post_res) {
                    post_res.on('data', function (chunk) {
                        response += chunk;
                    });

                    post_res.on('end', function () {
                        res.json(response)
                    });
                });

                post_req.write(post_data);
                post_req.end();
            });
        } else {
            console.log("Checksum Mismatched");
        }
    })

})


// app.post('/payment', function (req, res) {
//     /* import checksum generation utility */

//     const { amount, email } = req.body;

//     const totalAmount = JSON.stringify(amount);

//     var params = {};

//     /* initialize an array */
//     params["MID"] = process.env.M_ID;
//     params["WEBSITE"] = process.env.WEBSITE;
//     params["CHANNEL_ID"] = process.env.CHANNEL_ID;
//     params["INDUSTRY_TYPE_ID"] = process.env.INDUSTRY;
//     params["ORDER_ID"] = uuidv4();
//     params["TXN_AMOUNT"] = totalAmount;
//     params["CALLBACK_URL"] = "http://localhost:8080/callback";
//     params["EMAIL"] = email;
//     params["MOBILE_N0"] = "+919008299898";


//     console.log(params);

//     /**
//     * Generate checksum by parameters we have
//     * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
//     */
//     var paytmChecksum = PaytmChecksum.generateSignature(params, process.env.MERCHANT_KEY);
//     paytmChecksum.then(function (checksum) {
//         const paytmparams = {
//             ...params,
//             'CHECKSUMHASH': checksum
//         };

//         res.json(paytmparams);
//     }).catch(function (error) {
//         console.log(error);
//     });
// });


app.post('/payment', (req, res) => {


    const { amount, email } = req.body;

    /* import checksum generation utility */
    const totalAmount = JSON.stringify(amount);
    var params = {};

    /* initialize an array */
    params['MID'] = process.env.PAYTM_MID;
    params['WEBSITE'] = process.env.PAYTM_WEBSITE;
    params['CHANNEL_ID'] = process.env.PAYTM_CHANNEL_ID;
    params['INDUSTRY_TYPE_ID'] = process.env.PAYTM_INDUSTRY_TYPE_ID;
    params['ORDER_ID'] = uuidv4();
    params['CUST_ID'] = process.env.PAYTM_CUST_ID;
    params['TXN_AMOUNT'] = totalAmount;
    params['CALLBACK_URL'] = 'http://localhost:8080/callback';
    params['EMAIL'] = email;
    params['MOBILE_NO'] = '9008299898';

    /**
    * Generate checksum by parameters we have
    * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
    */
    var paytmChecksum = PaytmChecksum.generateSignature(params, process.env.PAYTM_MERCHANT_KEY);
    paytmChecksum.then(function (checksum) {
        let paytmParams = {
            ...params,
            "CHECKSUMHASH": checksum
        }
        res.json(paytmParams)
    }).catch(function (error) {
        console.log(error);
    });

})

app.listen(process.env.PORT || 8080, () => {
    console.log('starting server');
});