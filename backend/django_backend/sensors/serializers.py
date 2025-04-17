from .models import EquipmentFault
from rest_framework import serializers

class SensorReadingSerializer(serializers.Serializer):
    time = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')
    sensor_id = serializers.IntegerField()
    temperature = serializers.FloatField(allow_null=True)
    humidity = serializers.FloatField(allow_null=True)
    co2 = serializers.FloatField(allow_null=True)
    power = serializers.FloatField(allow_null=True)
    presence = serializers.IntegerField(allow_null=True)
    sensor_type = serializers.CharField()
    floor = serializers.IntegerField(min_value=1, max_value=3)  # Align with SMALLINT, floors 1-3
    room = serializers.IntegerField(min_value=1, max_value=5)   # Align with SMALLINT, rooms 1-5

class EquipmentFaultSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)  # For resolution
    time = serializers.DateTimeField(format='%Y-%m-%dT%H:%M:%S%z')
    floor = serializers.IntegerField(min_value=1, max_value=3)  # SMALLINT
    room = serializers.IntegerField(min_value=1, max_value=5)   # SMALLINT
    device_type = serializers.CharField()
    fault_flags = serializers.IntegerField()
    severity = serializers.IntegerField(min_value=1, max_value=3)  # SMALLINT, 1=red, 2=yellow, 3=normal
    resolved = serializers.BooleanField()

     