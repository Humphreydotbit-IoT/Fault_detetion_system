from django.db import models
from django.db.models import Q


class SensorReading(models.Model):
    id = models.BigIntegerField(primary_key=True)
    time = models.DateTimeField()
    sensor_id = models.BigIntegerField()
    temperature = models.FloatField(null=True)
    humidity = models.FloatField(null=True)
    co2 = models.FloatField(null=True)
    power = models.FloatField(null=True)
    presence = models.IntegerField(null=True)
    sensor_type = models.TextField()
    floor = models.IntegerField()
    room = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'sensors_sensorreading'
        constraints = [
            models.UniqueConstraint(
                fields=['time', 'sensor_id'],
                name='sensors_sensorreading_time_sensor_id_unique'
            )
        ]
        indexes = [
            models.Index(fields=['time'], name='sensors_sensorreading_time_idx'),
        ]

    def __str__(self):
        return f"SensorReading object (id={self.id}, {self.time}, {self.sensor_id})"


class EquipmentFault(models.Model):
    id = models.BigIntegerField(primary_key=True)
    time = models.DateTimeField()
    floor = models.SmallIntegerField()
    room = models.SmallIntegerField()
    device_type = models.TextField()
    fault_flags = models.IntegerField()
    severity = models.SmallIntegerField()
    resolved = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = 'equipment_faults'
        constraints = [
            models.CheckConstraint(
                check=models.Q(severity__gte=1, severity__lte=3),
                name='equipment_faults_severity_check'
            ),
            models.UniqueConstraint(
                fields=['time', 'id'],
                name='equipment_faults_time_id_unique'
            ),
        ]
        indexes = [
            models.Index(fields=['time'], name='equipment_faults_time_idx'),
            models.Index(fields=['floor', 'room', 'time'], name='idx_faults_search'),
            models.Index(fields=['severity'], condition=Q(resolved=False), name='idx_unresolved_faults'),
        ]

    def __str__(self):
        return f"EquipmentFault object (id={self.id}, {self.time}, floor{self.floor}.room{self.room}, {self.device_type})"