FROM mysql:8

COPY wrapped_entrypoint.sh /usr/local/bin/wrapped_entrypoint.sh

ENTRYPOINT ["bash", "/usr/local/bin/wrapped_entrypoint.sh"]
