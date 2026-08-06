"""add url scan reports table

Revision ID: 0004_url_scan_reports
Revises: 0003_scan_reports
Create Date: 2026-08-06 17:55:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004_url_scan_reports'
down_revision = '0003_scan_reports'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'url_scan_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('url', sa.String(length=2048), nullable=False),
        sa.Column('normalized_url', sa.String(length=2048), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('classification', sa.String(length=50), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('report_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('url_scan_reports')
