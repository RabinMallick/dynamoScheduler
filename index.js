const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const requestPro = require('request-promise');
const cheerio = require('cheerio');
const amazon = require('amazon-product-api');

const docClient = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2'
});


const getNumber = function (review) {
    let match = review.match(/\d+(?:\.\d+)?/g);
    return match ? match[0] : 0;
}

const webCrawler = function (url) {

    const options = {
        uri: url,
        transform: function (body) {
            return cheerio.load(body);
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36'
        },
        gzip: true
    };

    let results = requestPro(options)
        .then(function (jQuery) {
            let review = jQuery("img[align='absbottom']").attr('alt');
            if (review)
                return getNumber(review);
            else return 0;
        })
        .catch(function (err) {
            console.error(err);
            results = err;
        });

    return results;
}

const client = amazon.createClient({
    awsId: "AKIAIXL2CZWKN3TYZTEA",
    awsSecret: "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",
    awsTag: "tagflixuk-21",
});


exports.handler = (event, context, callback) => {

    const time = new Date().getTime() - (60 * 1000);

    let queryParams = {
        TableName: "TagflixMashUP",
        IndexName: "SchedulerIndex",
        Limit: 2,
        KeyConditionExpression: "merchant = :mer and updated_at < :t1 ",
        ExpressionAttributeValues: {
            ":t1": time,
            ":mer": "AMAZON"
        }
    }


    docClient.query(queryParams, function (err, data) {

        if (err) {
            console.log(queryParams);
            callback(err, null);
        } else {

            client.itemLookup({
                idType: 'ASIN',
                itemId:  data.Items[0].product_id,
                domain: 'webservices.amazon.co.uk',
                responseGroup: 'ItemAttributes,Offers,Images,Reviews'
            }).then(function (results) {

                const reviewUrl = results[0].CustomerReviews[0].IFrameURL[0];
                const ratingPromise = webCrawler(reviewUrl);

                ratingPromise.then((response) => {
                    //const price = getNumber(results[0].ItemAttributes[0].ListPrice[0].FormattedPrice[0]);
                    const price = getNumber(results[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0]);
                    const resObject = {
                        merchant: "AMAZON",
                        title: results[0].ItemAttributes[0].Title[0],
                        price: parseFloat(price),
                        currency: results[0].ItemAttributes[0].ListPrice[0].CurrencyCode[0],
                        seller_name: results[0].ItemAttributes[0].Publisher[0],
                        rating: response || 0,
                        img_url: results[0].LargeImage[0].URL[0],
                        aff_link: results[0].DetailPageURL[0],
                        product_id: data.Items[0].product_id,
                    }

                    const succeedParams =
                    {
                        TableName: "TagflixMashUP",
                        Key: {
                            "merchant": "AMAZON",
                            "tagflix_id": data.Items[0].tagflix_id
                        },
                        UpdateExpression: "set updated_at = :u, title = :t, last_update_status = :ls , price = :p,  currency = :c, seller_name = :s, rating = :r,  img_url = :i, aff_link = :a,  product_id = :pid ",
                        ExpressionAttributeValues: {
                            ":u": time,
                            ":ls": "SUCCESS",
                            ":t": resObject.title,
                            ":p": resObject.price,
                            ":c": resObject.currency,
                            ":s": resObject.seller_name,
                            ":r": resObject.rating,
                            ":i": resObject.img_url,
                            ":a": resObject.aff_link,
                            ":pid": resObject.product_id
                        },
                        ReturnValues: "UPDATED_NEW"
                    };

                    let failedParams =
                    {
                        TableName: "TagflixMashUP",
                        Key: {
                            "merchant": "AMAZON",
                            "tagflix_id": data.Items[0].tagflix_id
                        },
                        UpdateExpression: "set last_update_status = :ls",
                        ExpressionAttributeValues: {
                            ":ls": "FAILED"
                        },
                        ReturnValues: "UPDATED_NEW"
                    };

                    docClient.update(succeedParams, function (err, updateData) {
                        if (err) {
                            console.log(updateData);
                            docClient.update(failedParams, function (failErr, failData) {
                                if (failErr) {
                                    console.log(failErr);
                                    callback(failErr, null);
                                } else {
                                    console.log(failData);
                                    callback(null, failData);
                                }
                            });
                            callback(err, null);
                        } else {
                            console.log(succeedParams);
                            callback(null, updateData);
                        }
                    });

                    //return resObject;
                });

            }).catch(function (err) {
                return err;
            });

            //callback(null, data);

        }
    });

};
