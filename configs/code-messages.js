var MESSAGES = {
    200: 'OK',
    422: 'Unprocessable Entity',
    400: 'Bad request',
    401: 'Unauthorized',
    404: 'Not found',
    403: 'Forbidden',
    500: 'Internal server error'
};

function getMessageByHTTPCode (code) {
    if (!code || !MESSAGES[code]) {
        return 'Unknown HTTP code #' + code;
    }
    return MESSAGES[code];
}

module.exports = getMessageByHTTPCode;