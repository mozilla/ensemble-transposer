import falcon

from ensemble_transpose import transpose


class FirefoxHardwareReport:
    def on_get(self, req, res):
        res.media = transpose('manifests/firefox-hardware-report.json')


api = falcon.API()
api.add_route('/firefox-hardware-report', FirefoxHardwareReport())
