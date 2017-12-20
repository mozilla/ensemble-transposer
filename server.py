import falcon
from falcon_cors import CORS

from ensemble_transpose import transpose


class FirefoxHardwareReport:
    def on_get(self, req, res):
        res.media = transpose('manifests/firefox-hardware-report.json')

cors = CORS(allow_all_origins=True)
api = falcon.API(middleware=[cors.middleware])

# Routes
api.add_route('/firefox-hardware-report', FirefoxHardwareReport())
