FROM python:3.10

WORKDIR /app

COPY . /app

RUN pip install flask

EXPOSE 5000

ENV FLASK_APP=app.py

CMD ["python", "app.py"]
