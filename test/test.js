'use strict';

var expect = require('chai').expect;

var myLambda = require('../index');

describe('myLambda', function () {

    [
        "B07HH9P7B9",
        "B01JZF2ZEY"

    ].forEach(function (productId) {

        it(`successful invocation: id=${productId}`, function (done) {

            var context = {

                succeed: function (result) {

                    expect(result).to.be.an('object');
                    done();
                },

                fail: function () {

                    done(new Error('never context.fail'));
                }
            }

            myLambda.handler({ productId: productId }, {  context  }, (err, result) => {

                try {

                    expect(err).to.not.exist;
                    expect(result).to.exist;
                    // expect(result).to.be.an('object');
                    // expect(result.body.merchant).to.equal('AMAZON');
                    // expect(result.body.title).to.exist;
                    // expect(result.body.price).to.exist;
                    // expect(result.body.currency).to.exist;
                    // expect(result.body.seller_name).to.exist;
                    // expect(result.body.rating).to.exist;
                    // expect(result.body.img_url).to.exist;
                    // expect(result.body.aff_link).to.exist;
                    // expect(result.body.product_id).to.equal(productId);
                    // expect(result.body.tagflix_id).to.exist;
                    // expect(result.statusCode).to.equal(200);

                    done();
                }
                catch (error) {

                    done(error);
                }
            });
        });
    });
});

